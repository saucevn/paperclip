# Localized UI Check Process

> Owner: CTO  
> Last updated: 2026-04-28  
> Related issues: [THC-17](/THC/issues/THC-17), [THC-16](/THC/issues/THC-16)

This document describes the repeatable process for verifying the localized UI after any software update (language strings, UX/UI changes, new features).

---

## Overview

Paperclip supports **English (en)** and **Vietnamese (vi)** via `i18next`.  
The check process has three layers:

| Layer | What it catches | When to run |
|-------|----------------|-------------|
| **L1 — Automated parity check** | Missing keys, untranslated strings | Every CI run / pre-release |
| **L2 — E2E localized smoke test** | Regression in rendered UI strings | Every CI run / pre-release |
| **L3 — Manual QA checklist** | Layout, font rendering, UX flows | Before every user-facing release |

---

## L1 — Automated Parity Check

**Script:** `scripts/check-i18n.mjs`

### What it checks
- Every key in `ui/public/locales/en/` exists in `ui/public/locales/vi/`
- No key in the target locale has the same value as the source locale (flags untranslated strings)
- Known loanwords and technical terms are whitelisted in `KNOWN_LOANWORDS` inside the script

### Running the check

```bash
# From the repo root
node scripts/check-i18n.mjs

# CI mode — exits with code 1 on any failure
node scripts/check-i18n.mjs --ci

# Check a different target locale
node scripts/check-i18n.mjs --target fr --locales ui/public/locales

# Check from a custom locales path
node scripts/check-i18n.mjs --source en --target vi --locales path/to/locales
```

### Exit codes
- `0` — all checks passed
- `1` — missing keys or untranslated strings (only when `--ci` flag is passed)

### Adding a new loanword
If a string is intentionally kept in English (e.g., "Email", "API", brand names), add it to
`KNOWN_LOANWORDS` in `scripts/check-i18n.mjs`:

```js
"namespace:dot.separated.key",   // reason why it is kept in English
```

### Adding a new locale
1. Create `ui/public/locales/<code>/` with all 15 namespace JSON files
2. Add the locale code to `SUPPORTED_LANGUAGES` in `ui/src/i18n/index.ts`
3. Run `node scripts/check-i18n.mjs --target <code>` and fix any gaps

---

## L2 — E2E Localized Smoke Test

**Spec:** `tests/e2e/localized-ui.spec.ts`

### What it checks
- Sidebar navigation labels render in Vietnamese after locale is set via `localStorage`
- Locale persists across a full page reload
- Settings / profile page renders the language section in Vietnamese

### Running the test

```bash
# Run all e2e tests (includes localized-ui.spec.ts)
pnpm test:e2e

# Run only the localized UI spec
npx playwright test tests/e2e/localized-ui.spec.ts --config tests/e2e/playwright.config.ts

# Headed mode (useful for visual debugging)
npx playwright test tests/e2e/localized-ui.spec.ts --config tests/e2e/playwright.config.ts --headed
```

### Test fixtures
The test uses `addInitScript` to seed `localStorage` with the `vi` locale key before any page content loads.  
This mirrors how a returning user with a saved language preference experiences the app.

---

## L3 — Manual QA Checklist

Run this checklist before every user-facing release that includes UI or language changes.

### Setup
1. Open the app in a browser
2. Navigate to **Settings → Profile → Language** and select **Tiếng Việt**
3. Reload the page

### Checklist

#### String coverage
- [ ] Sidebar navigation items display in Vietnamese ("Tổng quan", "Hộp thư", "Công việc", etc.)
- [ ] Dashboard page title and metrics labels display in Vietnamese
- [ ] Issue list columns and status labels display in Vietnamese
- [ ] Modal dialogs (create issue, create agent) use Vietnamese labels
- [ ] Error messages and empty-state text display in Vietnamese
- [ ] Toast notifications display in Vietnamese
- [ ] Date/time values use `vi-VN` locale formatting (e.g., "28 tháng 4, 2026")
- [ ] Relative times ("vừa xong", "2 giờ trước") display correctly

#### Layout and rendering
- [ ] No text is visibly truncated due to Vietnamese strings being longer than English (~15–30% longer on average)
- [ ] Buttons resize gracefully to fit translated labels (especially in narrow sidebars)
- [ ] Tables and list views handle longer Vietnamese strings without overflow
- [ ] Vietnamese diacritics render correctly across Chrome, Firefox, Safari
- [ ] Vietnamese diacritics render correctly on macOS and Windows

#### Fallback behavior
- [ ] Switching back to English restores all English strings
- [ ] Language preference persists after browser refresh
- [ ] Language preference persists after logout/login (when auth is enabled)
- [ ] Missing or new keys fall back to English rather than showing raw key strings (e.g., `issues.newKey`)

#### Onboarding wizard (pending THC-15)
> Note: The following onboarding strings are currently hardcoded in English and will be addressed in [THC-15](/THC/issues/THC-15):
> - "Name your company", "Create your first agent", "Give it something to do", "Ready to launch"
>
> Until THC-15 is complete, these should be flagged as known gaps, not regressions.

#### RTL / LTR
- Vietnamese is LTR — verify no unintentional RTL layout artifacts exist when switching locales

---

## CI Integration

Add the following steps to your CI pipeline (e.g., GitHub Actions):

```yaml
- name: i18n parity check
  run: node scripts/check-i18n.mjs --ci

- name: Localized UI e2e smoke
  run: npx playwright test tests/e2e/localized-ui.spec.ts --config tests/e2e/playwright.config.ts
```

The parity check is fast (~1 s) and should run on every PR that touches `ui/public/locales/**` or `ui/src/**`.

---

## Adding a New Feature — Translator Workflow

When a developer adds a new UI string:

1. Add the key to `ui/public/locales/en/<namespace>.json`
2. Add the translated value to `ui/public/locales/vi/<namespace>.json`
3. Run `node scripts/check-i18n.mjs` locally to confirm parity
4. If translation is not yet available, add the key to `vi` with the English value **and** add it to the `TODO_TRANSLATIONS` comment block at the top of the vi file so it's visible for the next translation pass

When a developer adds a new page or component:

1. Ensure the component calls `useTranslation(<namespace>)` and wraps all user-visible strings in `t()`
2. Run `node scripts/check-foreign-t.mjs` (future: ESLint rule) to catch hardcoded strings
3. Add the checklist item "new component renders in vi" to the PR description

---

## Contacts

| Role | Responsibility |
|------|----------------|
| **CTO** | Owns the automated checks and i18n infrastructure |
| **QA (when hired)** | Owns L3 manual checklist execution |
| **UX Designer (when hired)** | Reviews layout and typography in non-English locales |
