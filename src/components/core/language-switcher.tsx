"use client";

import { useTransition } from "react";
import { useParams } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

// Fix for "French translation is not working": before this, the ONLY
// language control anywhere in the UI was the Settings > Language
// field (profile-form.tsx) — and that field only saved
// preferred_language to the database. Nothing ever read that column
// back to redirect or set a cookie, so picking "Français" there did
// nothing visible at all. This is the first real, working switcher:
// it uses the locale-aware router from src/lib/i18n/navigation.ts to
// replace the CURRENT page's locale segment immediately (Section 12 —
// no refresh needed) via `router.replace(pathname, { locale })`, which
// also updates the NEXT_LOCALE cookie next-intl reads on future
// requests, so the choice persists across refresh/navigation/sign-out
// (Section 12/13). Visible on every authenticated page via the Header.
export function LanguageSwitcher() {
  const t = useTranslations("settings");
  const router = useRouter();
  const pathname = usePathname();
  const { locale: currentLocale } = useParams<{ locale: string }>();
  const [pending, startTransition] = useTransition();

  function switchTo(locale: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale });
    });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t("language")}
          disabled={pending}
          className="flex h-10 w-10 items-center justify-center rounded-full text-secondary hover:bg-surface disabled:opacity-50"
        >
          <Globe size={20} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-40 rounded-card border border-surface bg-white p-1 shadow-lg"
        >
          {locales.map((locale) => (
            <DropdownMenu.Item
              key={locale}
              onSelect={() => switchTo(locale)}
              className="flex cursor-pointer items-center justify-between rounded px-2 py-2 text-sm text-secondary outline-none hover:bg-surface"
            >
              {localeNames[locale]}
              {locale === currentLocale && <Check size={14} className="text-primary" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
