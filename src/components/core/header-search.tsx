"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { HEALTH_ITEMS, PLANNING_ITEMS, FINANCE_ITEMS, FLAT_MODULES } from "@/components/core/sidebar-nav-content";
import { useRouter } from "@/lib/i18n/navigation";

// A real, small "jump to page" quick-search — not a full-text search
// across health records (that would need a new search index/API, out of
// scope for a header control) but a genuine, working way to reach any
// page by name, which is what the header search affordance is actually
// for on a first pass. Reuses the exact same nav item list the sidebar
// renders, so there's one source of truth for "what pages exist."
export function HeaderSearch() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => [
      { href: "/dashboard", key: "dashboard" as const },
      ...HEALTH_ITEMS,
      { href: "/calendar", key: "calendar" as const },
      ...PLANNING_ITEMS,
      ...FINANCE_ITEMS,
      ...FLAT_MODULES,
      { href: "/settings", key: "settings" as const },
    ],
    []
  );

  const results = query.trim()
    ? items.filter((item) => t(item.key).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  function go(href: string) {
    router.push(href);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative hidden w-full max-w-xs sm:block">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={tCommon("search")}
        aria-label={tCommon("search")}
        className="w-full rounded border border-surface bg-surface px-3 py-2 text-sm text-secondary placeholder:text-muted focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-card border border-surface bg-white py-1 shadow-lg">
          {results.map((item) => (
            <li key={item.href}>
              <button
                type="button"
                onMouseDown={() => go(item.href)}
                className="block w-full px-3 py-2 text-left text-sm text-secondary hover:bg-surface"
              >
                {t(item.key)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
