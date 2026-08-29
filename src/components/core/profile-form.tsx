"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { Profile } from "@/types/core/entities";
import { localeNames, type Locale } from "@/lib/i18n/config";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

// The Settings > Language field used to only PATCH preferred_language
// to the database — nothing ever read that column back to actually
// change the active locale, so picking "Français" here appeared to do
// nothing (this was the platform's core French-translation bug; see
// language-switcher.tsx for the real fix used elsewhere). Saving here
// now also navigates to the same page under the newly chosen locale.
export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState<Locale>(profile.preferred_language);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName,
        preferred_language: preferredLanguage,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError(t("saveError"));
      return;
    }

    setSaved(true);

    if (preferredLanguage !== profile.preferred_language) {
      router.replace(pathname, { locale: preferredLanguage });
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}
      {saved && <p className="text-sm text-status-normal">{t("saved")}</p>}

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("displayName")}
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t("language")}
        <select
          value={preferredLanguage}
          onChange={(e) => setPreferredLanguage(e.target.value as Locale)}
          className="rounded border border-slate-300 bg-white px-3.5 py-3 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-secondary"
        >
          {(Object.keys(localeNames) as Locale[]).map((locale) => (
            <option key={locale} value={locale}>
              {localeNames[locale]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {tCommon("save")}
      </button>
    </form>
  );
}
