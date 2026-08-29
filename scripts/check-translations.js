#!/usr/bin/env node
// Fix French Translation / i18n System spec, Section 21: "Create a
// development check that identifies missing translation keys... do
// not silently display undefined." This is the standalone CLI form of
// that check (`npm run check-translations`); tests/translations.test.ts
// runs the same comparison automatically as part of `npm test`.
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "src", "locales");

function flatten(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flatten(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadLocale(locale) {
  const filePath = path.join(LOCALES_DIR, locale, "common.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const locales = fs.readdirSync(LOCALES_DIR).filter((entry) => fs.statSync(path.join(LOCALES_DIR, entry)).isDirectory());

if (locales.length < 2) {
  console.log(`Only found locale(s): ${locales.join(", ")}. Nothing to compare.`);
  process.exit(0);
}

const keysByLocale = new Map(locales.map((locale) => [locale, new Set(flatten(loadLocale(locale)))]));
const allKeys = new Set([...keysByLocale.values()].flatMap((set) => [...set]));

let missingCount = 0;
for (const key of [...allKeys].sort()) {
  const missingFrom = locales.filter((locale) => !keysByLocale.get(locale).has(key));
  if (missingFrom.length > 0) {
    missingCount++;
    for (const locale of missingFrom) {
      console.error(`[MISSING TRANSLATION] ${locale}: ${key}`);
    }
  }
}

if (missingCount > 0) {
  console.error(`\n${missingCount} key(s) missing from at least one locale.`);
  process.exit(1);
} else {
  console.log(`All ${allKeys.size} translation keys are present in every locale (${locales.join(", ")}).`);
}
