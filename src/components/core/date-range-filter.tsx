"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, Check, X } from "lucide-react";
import { QUICK_RANGE_ORDER, computeQuickRange, matchQuickRange, type QuickRangeKey, type DateRange } from "@/lib/dates/range";

// The ONE reusable LifeOS date-range filter (platform-wide feature spec:
// "Build it once... integrate it selectively"). Syncs to the URL as
// ?from=&to= (Section 7) so refresh/back-forward/bookmarking all work,
// and is visually secondary by design (Section 17) — small text, no
// oversized controls, a plain border rather than a filled card, meant to
// sit quietly under a page's title/add-button row, not compete with it.
export function DateRangeFilter({
  quickRanges = ["7d", "30d", "3m", "6m", "thisYear", "custom"],
  label,
}: {
  quickRanges?: QuickRangeKey[];
  label?: string;
}) {
  const t = useTranslations("dateRangeFilter");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current: DateRange = {
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };
  // `current` is a fresh object every render; from/to below are the real dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeQuickRange = useMemo(() => matchQuickRange(current, new Date()), [current.from, current.to]);

  const [customOpen, setCustomOpen] = useState(activeQuickRange === "custom");
  const [draftFrom, setDraftFrom] = useState(current.from ?? "");
  const [draftTo, setDraftTo] = useState(current.to ?? "");
  const [error, setError] = useState<string | null>(null);

  const orderedQuickRanges = QUICK_RANGE_ORDER.filter((key) => quickRanges.includes(key));

  function pushRange(range: DateRange) {
    const params = new URLSearchParams(searchParams.toString());
    if (range.from) params.set("from", range.from);
    else params.delete("from");
    if (range.to) params.set("to", range.to);
    else params.delete("to");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleQuickRange(key: QuickRangeKey) {
    setError(null);
    if (key === "custom") {
      setCustomOpen(true);
      setDraftFrom(current.from ?? "");
      setDraftTo(current.to ?? "");
      return;
    }
    setCustomOpen(false);
    pushRange(computeQuickRange(key, new Date()));
  }

  function handleApplyCustom() {
    if (!draftFrom || !draftTo) {
      setError(t("bothDatesRequired"));
      return;
    }
    if (draftFrom > draftTo) {
      setError(t("startAfterEnd"));
      return;
    }
    setError(null);
    pushRange({ from: draftFrom, to: draftTo });
  }

  function handleClear() {
    setError(null);
    setCustomOpen(false);
    pushRange({ from: null, to: null });
  }

  const hasActiveRange = Boolean(current.from && current.to);

  return (
    <div className="mb-4 flex flex-col gap-2 rounded border border-surface bg-white p-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <div className="flex shrink-0 items-center gap-1.5 text-muted">
        <CalendarDays size={14} />
        <span className="text-xs font-medium uppercase tracking-wide">{label ?? t("label")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {orderedQuickRanges.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleQuickRange(key)}
            aria-pressed={activeQuickRange === key}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded border px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              activeQuickRange === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-surface text-secondary hover:bg-surface"
            }`}
          >
            {t(`quickRanges.${key}`)}
          </button>
        ))}
      </div>

      {customOpen && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-1.5">
            {t("startDate")}
            <input
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(e) => setDraftFrom(e.target.value)}
              aria-label={t("startDate")}
              className="min-h-11 w-full rounded border border-surface bg-white px-2 text-sm text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            />
          </label>
          <span className="hidden text-muted sm:inline">→</span>
          <label className="flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-1.5">
            {t("endDate")}
            <input
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              aria-label={t("endDate")}
              className="min-h-11 w-full rounded border border-surface bg-white px-2 text-sm text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            />
          </label>
          <button
            type="button"
            onClick={handleApplyCustom}
            className="flex min-h-11 shrink-0 items-center justify-center gap-1 rounded bg-primary px-4 text-xs font-medium text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Check size={14} />
            {t("apply")}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-status-urgent">{error}</p>}

      {hasActiveRange && !customOpen && (
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs text-muted">
            {current.from} – {current.to}
          </span>
          <button
            type="button"
            onClick={handleClear}
            aria-label={t("clear")}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded border border-surface text-muted hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
