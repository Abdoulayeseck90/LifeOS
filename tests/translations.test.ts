import { describe, it, expect } from "vitest";
import en from "@/locales/en/common.json";
import fr from "@/locales/fr/common.json";

// Fix French Translation / i18n System spec, Section 21: a development
// check that makes a missing translation key impossible to miss. This
// runs on every `npm test`, in addition to the standalone
// `npm run check-translations` CLI script (scripts/check-translations.js)
// and next-intl's own runtime onError/getMessageFallback logging
// (src/lib/i18n/request.ts) for keys that are actually rendered.
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

function flatten(obj: Record<string, JsonValue>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flatten(value as Record<string, JsonValue>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe("translation completeness", () => {
  it("has every en key present in fr and vice versa", () => {
    const enKeys = new Set(flatten(en));
    const frKeys = new Set(flatten(fr));

    const missingFromFr = [...enKeys].filter((k) => !frKeys.has(k));
    const missingFromEn = [...frKeys].filter((k) => !enKeys.has(k));

    expect(missingFromFr, `[MISSING TRANSLATION] fr: ${missingFromFr.join(", ")}`).toEqual([]);
    expect(missingFromEn, `[MISSING TRANSLATION] en: ${missingFromEn.join(", ")}`).toEqual([]);
  });
});
