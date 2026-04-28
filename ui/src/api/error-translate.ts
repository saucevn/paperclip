import { ApiError } from "./client";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * Dịch lỗi API sang tiếng Việt (hoặc ngôn ngữ hiện tại).
 * Ưu tiên dùng error.code để tra từ errors.json; fallback về error.message gốc.
 */
export function translateApiError(
  error: unknown,
  t: TranslateFn,
  fallback?: string,
): string {
  if (error instanceof ApiError) {
    const code = error.code;
    if (code) {
      const translated = t(`errors:server.${code}`, { defaultValue: "" });
      if (translated) return translated;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback ?? t("errors:generic");
}
