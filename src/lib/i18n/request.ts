import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode } from "next-intl";
import { locales, type Locale } from "./config";

const isDev = process.env.NODE_ENV !== "production";

// Loads UI-chrome strings for the requested locale. Per Spec Section 6.3:
// this covers UI chrome + reference/lookup data labels only.
// User-generated free text (notes, symptoms, doctor questions) is never
// routed through this — it stays stored as-typed in whatever language
// the user wrote it in.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    locale = "en";
  }

  return {
    locale,
    messages: (await import(`../../locales/${locale}/common.json`)).default,
    // Fix for "French translation is not working," Section 21 — a
    // missing key must never silently render nothing/undefined. In
    // development it's logged loudly and shown inline so it's
    // impossible to miss; in production it falls back to the key path
    // (still visibly wrong, never a blank string) and the error is
    // still logged server-side for diagnosis, never exposed raw to the
    // user beyond that fallback text.
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        console.error(`[MISSING TRANSLATION] ${locale}: ${error.originalMessage ?? error.message}`);
      } else {
        console.error(error);
      }
    },
    getMessageFallback({ namespace, key, error }) {
      const fullKey = [namespace, key].filter(Boolean).join(".");
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        return isDev ? `[MISSING: ${fullKey}]` : fullKey;
      }
      return fullKey;
    },
  };
});
