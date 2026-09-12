"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";
import { GIG_PLATFORMS } from "@/components/calendar/appointment-form";
import { buildWeekPlanItems, computeWeekPlanTotals, type WeekDayPlan } from "@/lib/work/gig-plan-week";

function emptyDay(): WeekDayPlan {
  return { included: false, startTime: "", endTime: "", platforms: [], earningsGoal: "", notes: "" };
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Gig Driving spec, Section 4: schedule an entire week in one flow
// instead of adding each shift one at a time. Every day is independently
// configurable (its own Off/On, times, platforms, goal, notes) --
// nothing forces every day to match. Reuses RecordFormModal for the
// trigger+modal shell/dirty-check (same as every other create form) and
// the same GIG_PLATFORMS list / bulk endpoint the single Add Shift
// Schedule form and Plan Month both use.
export function GigPlanWeekModal() {
  const t = useTranslations("gigDriving.planWeek");
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
        <PlanWeekForm
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

function PlanWeekForm({
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
  const [weekStart, setWeekStart] = useState(todayLocalDate());
  const [days, setDays] = useState<WeekDayPlan[]>(() => Array.from({ length: 7 }, emptyDay));
  const [step, setStep] = useState<"configure" | "review">("configure");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateDay(index: number, patch: Partial<WeekDayPlan>) {
    setDays((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
    registerDirty(true);
  }

  function dayLabel(index: number): string {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + index);
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  function goToReview() {
    const included = days.filter((d) => d.included);
    if (included.length === 0) {
      setError(t("noDaysSelected"));
      return;
    }
    for (const day of included) {
      if (!day.startTime || !day.endTime) {
        setError(t("timesRequired"));
        return;
      }
      if (day.startTime === day.endTime) {
        setError(t("endTimeEqualsStart"));
        return;
      }
    }
    setError(null);
    setStep("review");
  }

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    const items = buildWeekPlanItems(weekStart, days, title.trim() || t("defaultTitle"));

    const response = await fetch("/api/calendar/appointments/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("saveError"));
      return;
    }

    onSaved();
  }

  if (step === "review") {
    const totals = computeWeekPlanTotals(days);
    return (
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-status-urgent">{error}</p>}
        <div className="flex flex-col gap-2 rounded-card border border-surface p-3">
          <p className="text-sm font-medium text-secondary">{t("reviewTitle")}</p>
          <ul className="flex flex-col gap-1 text-sm text-secondary">
            {days.map((day, index) =>
              day.included ? (
                <li key={index} className="flex items-center justify-between">
                  <span>{dayLabel(index)}</span>
                  <span className="text-muted">
                    {day.startTime}–{day.endTime}
                    {day.earningsGoal.trim() ? ` · ${t("goal")}: $${day.earningsGoal}` : ""}
                  </span>
                </li>
              ) : null
            )}
          </ul>
          <div className="mt-2 border-t border-surface pt-2 text-sm text-secondary">
            <p>{t("weeklyPlannedHours", { hours: totals.totalHours.toFixed(1) })}</p>
            <p>{t("weeklyEarningsGoal", { goal: totals.totalGoal.toFixed(2) })}</p>
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

      <FormField label={t("shiftTitle")} htmlFor="plan-week-title">
        <LifeOSInput id="plan-week-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>

      <FormField label={t("weekStarting")} htmlFor="plan-week-start" required>
        <LifeOSInput
          id="plan-week-start"
          type="date"
          required
          value={weekStart}
          onChange={(e) => {
            setWeekStart(e.target.value);
            registerDirty(true);
          }}
        />
      </FormField>

      <div className="flex flex-col gap-3">
        {days.map((day, index) => (
          <div key={index} className="rounded-card border border-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-secondary">{dayLabel(index)}</p>
              <LifeOSCheckbox
                label={t("include")}
                checked={day.included}
                onChange={(e) => updateDay(index, { included: e.target.checked })}
              />
            </div>

            {day.included ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label={t("startTime")} htmlFor={`plan-week-start-${index}`} required>
                    <LifeOSInput
                      id={`plan-week-start-${index}`}
                      type="time"
                      required
                      value={day.startTime}
                      onChange={(e) => updateDay(index, { startTime: e.target.value })}
                    />
                  </FormField>
                  <FormField label={t("endTime")} htmlFor={`plan-week-end-${index}`} required>
                    <LifeOSInput
                      id={`plan-week-end-${index}`}
                      type="time"
                      required
                      value={day.endTime}
                      onChange={(e) => updateDay(index, { endTime: e.target.value })}
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
                        checked={day.platforms.includes(platform)}
                        onChange={(e) =>
                          updateDay(index, {
                            platforms: e.target.checked ? [...day.platforms, platform] : day.platforms.filter((p) => p !== platform),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
                <FormField label={t("earningsGoal")} htmlFor={`plan-week-goal-${index}`} optional>
                  <LifeOSInput
                    id={`plan-week-goal-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={day.earningsGoal}
                    onChange={(e) => updateDay(index, { earningsGoal: e.target.value })}
                  />
                </FormField>
              </div>
            ) : (
              <p className="text-sm text-muted">{t("off")}</p>
            )}
          </div>
        ))}
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
          onClick={goToReview}
          className="min-h-11 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("reviewButton")}
        </button>
      </div>
    </div>
  );
}
