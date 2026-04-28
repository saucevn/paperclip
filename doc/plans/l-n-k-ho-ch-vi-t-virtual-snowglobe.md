# Kế hoạch Việt hóa (Vietnamese Localization)

## Context

Ứng dụng Paperclip là một React 19 + Vite + TypeScript SPA (không dùng Next.js) dạng monorepo (pnpm). Toàn bộ ~2.383 chuỗi UI đang được hardcode bằng tiếng Anh trong ~359 file TSX/TS. Chưa có bất kỳ infrastructure i18n nào. Mục tiêu là thêm Tiếng Việt (`vi`) làm ngôn ngữ chính, giữ tiếng Anh (`en`) làm fallback, và cho phép người dùng chọn ngôn ngữ trong trang cài đặt Profile.

---

## Thư viện

Thêm vào `ui/package.json` (dependencies):

```
i18next                         ^24.x
react-i18next                   ^15.x
i18next-browser-languagedetector ^8.x
i18next-http-backend            ^3.x
```

Cài bằng:
```sh
pnpm --filter @paperclipai/ui add i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

Không cần Vite plugin. `i18next-http-backend` lazy-load JSON từ `/public/locales/` (giữ bundle nhỏ).

---

## Cấu trúc file translation

```
ui/public/locales/
  en/
    common.json        # Nút bấm, trạng thái, label chung
    navigation.json    # Sidebar, breadcrumb, mobile nav, command palette
    dashboard.json     # Trang Dashboard
    issues.json        # Issues & issue detail
    agents.json        # Agents & agent detail
    projects.json      # Projects & project detail
    routines.json      # Routines & routine detail
    inbox.json         # Inbox
    approvals.json     # Approvals
    costs.json         # Costs & finance
    settings.json      # Tất cả trang Settings (instance/company/profile)
    auth.json          # Auth, invite, CLI auth
    errors.json        # Error messages, loading states
  vi/
    (13 file tương ứng)
```

---

## File config i18n

**Tạo mới:** `ui/src/i18n/index.ts`

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

export const SUPPORTED_LANGUAGES = [
  { code: "en", nativeLabel: "English" },
  { code: "vi", nativeLabel: "Tiếng Việt" },
] as const;
export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
export const LANGUAGE_STORAGE_KEY = "paperclip.language";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "vi"],
    defaultNS: "common",
    ns: ["common","navigation","dashboard","issues","agents","projects",
         "routines","inbox","approvals","costs","settings","auth","errors"],
    backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
  });

export default i18n;
```

**Tạo mới:** `ui/src/i18n/types.ts` — TypeScript augmentation để type-check translation keys:

```typescript
import type commonEn from "../../public/locales/en/common.json";
// ... import type cho 12 namespace còn lại

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof commonEn;
      // ... 12 namespace còn lại
    };
  }
}
```

Import side-effect `"./types"` vào cuối `ui/src/i18n/index.ts`.

---

## Cập nhật `ui/src/main.tsx`

Thêm vào **đầu file** (trước tất cả imports khác):

```typescript
import "./i18n"; // Khởi tạo i18n trước khi render
```

Bọc toàn bộ provider tree với `I18nextProvider` + `Suspense`:

```tsx
import { Suspense } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
        <QueryClientProvider client={queryClient}>
          {/* ... provider tree hiện tại giữ nguyên ... */}
          <App />
        </QueryClientProvider>
      </Suspense>
    </I18nextProvider>
  </StrictMode>
);
```

`Suspense` là bắt buộc vì `HttpBackend` + `useSuspense: true` suspend cây component khi load JSON locale.

---

## Bộ chọn ngôn ngữ — `ui/src/pages/ProfileSettings.tsx`

Thêm `Select` chọn ngôn ngữ sau field Email (dòng ~260):

```tsx
import { useTranslation } from "react-i18next";
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Trong component:
const { t } = useTranslation("settings");

// JSX thêm vào:
<div className="space-y-2">
  <Label>{t("profile.language")}</Label>
  <Select
    value={i18n.language as SupportedLanguageCode}
    onValueChange={(code) => i18n.changeLanguage(code)}
  >
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <SelectItem key={lang.code} value={lang.code}>{lang.nativeLabel}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">{t("profile.languageDescription")}</p>
</div>
```

`i18n.changeLanguage()` triggers re-render tất cả component dùng `useTranslation`. Preference được lưu tự động vào `localStorage` qua `LanguageDetector`. Không cần page reload.

---

## Convention đặt tên key

- Namespace làm tiền tố khi dùng nhiều namespace: `t("navigation:sidebar.items.dashboard")`
- Dùng dấu chấm phân tách cấp: `domain.subdomain.key`
- camelCase mỗi segment, **không dùng underscore** (i18next dùng `_one`/`_other` cho plural)
- Ví dụ plural: `t("dashboard:budgetIncident.title", { count: n })` → key `title_one` / `title_other`

---

## Xử lý plural

Thay pattern hiện tại `incident${n === 1 ? "" : "s"}` (~15 chỗ) bằng:

```json
// en/dashboard.json
{ "budgetIncident": { "title_one": "{{count}} active budget incident", "title_other": "{{count}} active budget incidents" } }

// vi/dashboard.json  
{ "budgetIncident": { "title_one": "{{count}} sự cố ngân sách đang hoạt động", "title_other": "{{count}} sự cố ngân sách đang hoạt động" } }
```

Tiếng Việt không biến đổi số nhiều → `_one` và `_other` dùng cùng bản dịch là đúng.

---

## Xử lý date/number locale

**Tạo mới:** `ui/src/i18n/formatters.ts`

Hàm `formatCentsLocale`, `formatDateLocale`, `formatDateTimeLocale` nhận locale từ `i18n.language`.  
**Quyết định:** Giữ định dạng `en-US` cho số tiền USD (tránh nhầm lẫn `$1.234,56`), dùng `vi-VN` cho ngày/giờ.

Thay thế `timeAgo()` trong `ui/src/lib/utils.ts` bằng hook `useTimeAgo()` dùng `t("common:timeAgo.*")` ở **Phase 5**.

---

## Kế hoạch triển khai theo giai đoạn

### Phase 0 — Infrastructure (không thay đổi UI)
1. Cài packages
2. Tạo `ui/src/i18n/index.ts`, `types.ts`, `formatters.ts`
3. Tạo 13 file `en/*.json` (English source) + 13 file `vi/*.json` (bản dịch Tiếng Việt)
4. Cập nhật `ui/src/main.tsx`
5. Kiểm tra: `pnpm --filter @paperclipai/ui typecheck`

### Phase 1 — Navigation & Chrome (hiệu quả cao nhất)
Files: `Sidebar.tsx`, `SidebarSection.tsx`, `SidebarAccountMenu.tsx`, `MobileBottomNav.tsx`, `BreadcrumbBar.tsx`, `CommandPalette.tsx`, `Layout.tsx`

Pattern:
```tsx
const { t } = useTranslation("navigation");
// setBreadcrumbs([{ label: t("breadcrumbs.dashboard") }]);
// <SidebarNavItem label={t("sidebar.items.issues")} />
```

### Phase 2 — Bộ chọn ngôn ngữ trong ProfileSettings
Thêm Language selector vào `ProfileSettings.tsx`. Đây là gate kiểm tra end-to-end: switch sang Tiếng Việt phải đổi tất cả string của Phase 1.

### Phase 3 — Các trang chính
- **Batch A:** `Dashboard.tsx`, `Issues.tsx`, `Inbox.tsx`
- **Batch B:** `Agents.tsx`, `AgentDetail.tsx`
- **Batch C:** `Projects.tsx`, `ProjectDetail.tsx`, `Routines.tsx`, `RoutineDetail.tsx`
- **Batch D:** `Approvals.tsx`, `Goals.tsx`, `Costs.tsx`, `Activity.tsx`
- **Batch E:** Tất cả trang Settings (`CompanySettings.tsx`, `CompanyAccess.tsx`, v.v.)
- **Batch F:** `Auth.tsx`, `InviteLanding.tsx`, `CliAuth.tsx`, `NotFound.tsx`

### Phase 4 — Components
Ưu tiên cao: `NewIssueDialog.tsx`, `CommentThread.tsx`, `ApprovalCard.tsx`, `EmptyState.tsx`, `ActiveAgentsPanel.tsx`  
Ưu tiên trung: `IssueBlockedNotice.tsx`, `BudgetPolicyCard.tsx`, `StatusBadge.tsx`  
Ưu tiên thấp: `KeyboardShortcutsCheatsheet.tsx`, `ScheduleEditor.tsx`, aria-labels

### Phase 5 — Date/Number & timeAgo
Thay `toLocaleString("en-US")` bằng formatters locale-aware. Refactor `timeAgo.ts` thành hook `useTimeAgo()`.

---

## Files quan trọng cần sửa

| File | Thay đổi |
|------|----------|
| `ui/package.json` | Thêm 4 dependencies |
| `ui/src/main.tsx` | Import i18n, thêm `I18nextProvider` + `Suspense` |
| `ui/src/pages/ProfileSettings.tsx` | Thêm language selector, dùng `useTranslation` |
| `ui/src/components/Sidebar.tsx` | Dùng `useTranslation("navigation")` |
| `ui/src/lib/utils.ts` | Phase 5: refactor `timeAgo`, `formatCents`, v.v. |
| **Tạo mới:** `ui/src/i18n/index.ts` | Config i18next |
| **Tạo mới:** `ui/src/i18n/types.ts` | TypeScript augmentation |
| **Tạo mới:** `ui/src/i18n/formatters.ts` | Locale-aware formatters |
| **Tạo mới:** `ui/public/locales/en/*.json` (×13) | English source strings |
| **Tạo mới:** `ui/public/locales/vi/*.json` (×13) | Vietnamese translations |

---

## Kiểm tra

1. **Build:** `pnpm --filter @paperclipai/ui typecheck` → không lỗi TypeScript
2. **Runtime:** Chạy `pnpm dev` trong `ui/`, mở trình duyệt, vào Profile Settings → chọn "Tiếng Việt" → toàn bộ nav/breadcrumb/text chuyển sang tiếng Việt ngay lập tức
3. **Reload:** Sau khi reload trang, ngôn ngữ vẫn là Tiếng Việt (kiểm tra `localStorage.getItem("paperclip.language")`)
4. **Fallback:** Xóa key trong file `vi/*.json` → UI tự động fallback sang tiếng Anh
5. **Plural:** Kiểm tra Dashboard với nhiều budget incidents → số nhiều hiển thị đúng
