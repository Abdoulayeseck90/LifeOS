"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { GIG_PLATFORMS } from "@/components/calendar/appointment-form";
import { buildMonthPlanOccurrences, computeMonthPlanTotals, type WeekdayPlan } from "@/lib/work/gig-plan-month";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const; // Date#getDay() order: Sun..Sat

function emptyWeekdayPlan(): WeekdayPlan {
  return { selected: false, startTime: "", endTime: "", platforms: [], earningsGoal: "", notes: "" };
}

function currentMonthValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Gig Driving spec, Section 5: plan an entire month by picking recurring
// weekdays (e.g. "every Monday", "every Friday") instead of manually
// creating up to 30 individual shifts. Still generates one standalone
// appointment row per date (Section 5: "do NOT create one giant record
// representing an entire month") via the same bulk endpoint Plan Week
// uses -- every generated occurrence is independently editable/
// deletable afterward, and the preview step lets the user drop
// individual dates before saving (Section 5: "modify individual dates
// before saving").
export function GigPlanMonthModal() {
  const t = useTranslations("gigDriving.planMonth");
  const tCommon = useTranslations("common");
  const router = useRouter();

  return (
    <RecordFormModal
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="min-h-11 rounded border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
        >
          {t("trigger")}
        </button>
      )}
      modalTitle={t("title")}
    >
      {({ closeAfterSave, requestClose, registerDirty }) => (
        <PlanMonthForm
          onClose={requestClose}
          onSaved={() => {
            registerDirty(false);
            closeAfterSave();
            router.refresh();
          }}
          registerDirty={registerDirty}
          t={t}
          tCommon={tCommon}
        />
      )}
    </RecordFormModal>
  );
}

function PlanMonthForm({
  onClose,
  onSaved,
  registerDirty,
  t,
  tCommon,
}: {
  onClose: () => void;
  onSaved: () => void;
  registerDirty: (dirty: boolean) => void;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  const [title, setTitle] = useState(t("defaultTitle"));
  const [month, setMonth] = useState(currentMonthValue());
  const [weekdayPlans, setWeekdayPlans] = useState<WeekdayPlan[]>(() => WEEKDAYS.map(() => emptyWeekdayPlan()));
  const [step, setStep] = useState<"configure" | "preview">("configure");
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateWeekday(index: number, patch: Partial<WeekdayPlan>) {
    setWeekdayPlans((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
    registerDirty(true);
  }

  function weekdayLabel(index: number): string {
    // Any date whose getDay() === index — Jan 4 1970 was a Sunday (index 0).
    return new Date(1970, 0, 4 + index).toLocaleDateString(undefined, { weekday: "long" });
  }

  function goToPreview() {
    const selected = weekdayPlans.filter((p) => p.selected);
    if (selected.length === 0) {
      setError(t("noWeekdaysSelected"));
      return;
    }
    for (const plan of selected) {
      if (!plan.startTime || !plan.endTime) {
        setError(t("timesRequired"));
        return;
      }
      if (plan.startTime === plan.endTime) {
        setError(t("endTimeEqualsStart"));
        return;
      }
    }
    setError(null);
    setExcludedDates(new Set());
    setStep("preview");
  }

  const occurrences = buildMonthPlanOccurrences(month, weekdayPlans, title.trim() || t("defaultTitle"));
  const includedOccurrences = occurrences.filter((o) => !excludedDates.has(o.date));
  const totals = computeMonthPlanTotals(includedOccurrences);

  async function handleCreate() {
    if (includedOccurrences.length === 0) {
      setError(t("noWeekdaysSelected"));
      return;
    }
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/calendar/appointments/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: includedOccurrences.map((occurrence) => ({
          title: occurrence.title,
          date_time: occurrence.date_time,
          end_time: occurrence.end_time,
          category: occurrence.category,
          status: occurrence.status,
          gig_platforms: occurrence.gig_platforms,
          gig_earnings_goal: occurrence.gig_earnings_goal,
          notes: occurrence.notes,
        })),
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("saveError"));
      return;
    }

    onSaved();
  }

  if (step === "preview") {
    return (
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        <div className="flex flex-col gap-2 rounded-card border border-surface p-3">
          <p className="text-sm font-medium text-secondary">{t("previewTitle")}</p>
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm text-secondary">
            {occurrences.map((occurrence) => {
              const excluded = excludedDates.has(occurrence.date);
              return (
                <li key={occurrence.date} className={`flex items-center justify-between gap-2 ${excluded ? "opacity-40" : ""}`}>
                  <span>
                    {new Date(`${occurrence.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {occurrence.date_time.slice(11, 16)}–{occurrence.end_time.slice(11, 16)}
                    {occurrence.gig_earnings_goal != null ? ` · ${t("goal")}: $${occurrence.gig_earnings_goal}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExcludedDates((prev) => {
                        const next = new Set(prev);
                        if (next.has(occurrence.date)) next.delete(occurrence.date);
                        else next.add(occurrence.date);
                        return next;
                      })
                    }
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    {excluded ? t("restore") : t("remove")}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-surface pt-2 text-sm text-secondary">
            <p>{t("monthlyPlannedHours", { hours: totals.totalHours.toFixed(1) })}</p>
            <p>{t("monthlyEarningsGoal", { goal: totals.totalGoal.toFixed(2) })}</p>
            <p>{t("numberOfShifts", { count: totals.shiftCount })}</p>
          </div>
        </div>
        <div className="flex justify-between">
          <button type="button" onClick={() => setStep("configure")} className="text-sm text-primary hover:underline">
            {tCommon("back")}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleCreate}
              className="min-h-11 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? tCommon("loading") : t("createSchedule")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <FormField label={t("shiftTitle")} htmlFor="plan-month-title">
        <LifeOSInput id="plan-month-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>

      <FormField label={t("month")} htmlFor="plan-month-month" required>
        <LifeOSInput
          id="plan-month-month"
          type="month"
          required
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            registerDirty(true);
          }}
        />
      </FormField>

      <div className="flex flex-col gap-3">
        {WEEKDAYS.map((weekday) => {
          const plan = weekdayPlans[weekday]!;
          return (
            <div key={weekday} className="rounded-card border border-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-secondary">{weekdayLabel(weekday)}</p>
                <LifeOSCheckbox
                  label={t("include")}
                  checked={plan.selected}
                  onChange={(e) => updateWeekday(weekday, { selected: e.target.checked })}
                />
              </div>

              {plan.selected ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label={t("startTime")} htmlFor={`plan-month-start-${weekday}`} required>
                      <LifeOSInput
                        id={`plan-month-start-${weekday}`}
                        type="time"
                        required
                        value={plan.startTime}
                        onChange={(e) => updateWeekday(weekday, { startTime: e.target.value })}
                      />
                    </FormField>
                    <FormField label={t("endTime")} htmlFor={`plan-month-end-${weekday}`} required>
                      <LifeOSInput
                        id={`plan-month-end-${weekday}`}
                        type="time"
                        required
                        value={plan.endTime}
                        onChange={(e) => updateWeekday(weekday, { endTime: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-secondary">{t("platforms")}</p>
                    <div className="flex flex-wrap gap-3">
                      {GIG_PLATFORMS.map((platform) => (
                        <LifeOSCheckbox
                          key={platform}
                          label={t(`platformOptions.${platform}`)}
                          checked={plan.platforms.includes(platform)}
                          onChange={(e) =>
                            updateWeekday(weekday, {
                              platforms: e.target.checked ? [...plan.platforms, platform] : plan.platforms.filter((p) => p !== platform),
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <FormField label={t("earningsGoal")} htmlFor={`plan-month-goal-${weekday}`} optional>
                    <LifeOSInput
                      id={`plan-month-goal-${weekday}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={plan.earningsGoal}
                      onChange={(e) => updateWeekday(weekday, { earningsGoal: e.target.value })}
                    />
                  </FormField>
                </div>
              ) : (
                <p className="text-sm text-muted">{t("off")}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-secondary hover:bg-surface"
        >
          {tCommon("cancel")}
        </button>
        <button
          type="button"
          onClick={goToPreview}
          className="min-h-11 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("previewButton")}
        </button>
      </div>
    </div>
  );
}
