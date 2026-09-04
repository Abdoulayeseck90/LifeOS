"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Play, Square, Plus, X } from "lucide-react";
import type { GigVehicle, GigShift, GigPlatform, GigExpenseCategory } from "@/types/work/entities";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";

const GIG_PLATFORMS: GigPlatform[] = ["doordash", "ubereats", "spark", "other"];
const EXPENSE_CATEGORIES: GigExpenseCategory[] = ["fuel", "maintenance", "tires", "repairs", "car_wash", "parking", "tolls", "phone", "insurance", "other"];

interface QuickExpenseRow {
  category: GigExpenseCategory;
  amount: string;
}

// The spec's core fast-path: "the user may be standing next to their
// vehicle" — Quick Start is odometer + platform(s), Quick End is
// odometer + per-platform earnings, nothing else required. Both hit the
// already-atomic API routes (startGigShift / end_gig_shift RPC).
export function GigQuickShiftPanel({ vehicles, inProgressShift }: { vehicles: GigVehicle[]; inProgressShift: GigShift | null }) {
  const t = useTranslations("gigDriving.quickShift");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Start state
  const [vehicleId, setVehicleId] = useState("");
  const [startOdometer, setStartOdometer] = useState("");
  const [platforms, setPlatforms] = useState<GigPlatform[]>([]);

  // Quick End state
  const [endOdometer, setEndOdometer] = useState("");
  const [earningsByPlatform, setEarningsByPlatform] = useState<Record<string, { gross: string; tips: string; bonuses: string }>>({});
  const [expenses, setExpenses] = useState<QuickExpenseRow[]>([]);

  function earningsFor(platform: GigPlatform) {
    return earningsByPlatform[platform] ?? { gross: "", tips: "", bonuses: "" };
  }

  function setEarningsFor(platform: GigPlatform, field: "gross" | "tips" | "bonuses", value: string) {
    setEarningsByPlatform((prev) => ({ ...prev, [platform]: { ...earningsFor(platform), [field]: value } }));
  }

  async function handleStart(event: FormEvent) {
    event.preventDefault();
    if (!startOdometer || platforms.length === 0) {
      setError(t("startValidation"));
      return;
    }
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/work/gig-driving/shifts/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_id: vehicleId || undefined,
        start_odometer: Number(startOdometer),
        platforms,
      }),
    });

    setSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("saveError"));
      return;
    }

    setStartOdometer("");
    setPlatforms([]);
    setVehicleId("");
    router.refresh();
  }

  async function handleEnd(event: FormEvent) {
    event.preventDefault();
    if (!inProgressShift) return;
    if (!endOdometer || Number(endOdometer) < inProgressShift.start_odometer) {
      setError(t("endValidation"));
      return;
    }
    setSubmitting(true);
    setError(null);

    const earnings = inProgressShift.platforms
      .map((platform) => {
        const row = earningsFor(platform);
        return {
          platform,
          gross: Number(row.gross) || 0,
          tips: Number(row.tips) || 0,
          bonuses: Number(row.bonuses) || 0,
        };
      })
      .filter((e) => e.gross > 0 || e.tips > 0 || e.bonuses > 0);

    const response = await fetch(`/api/work/gig-driving/shifts/${inProgressShift.id}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        end_odometer: Number(endOdometer),
        earnings,
        expenses: expenses.filter((e) => Number(e.amount) > 0).map((e) => ({ category: e.category, amount: Number(e.amount) })),
      }),
    });

    setSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : t("saveError"));
      return;
    }

    setEndOdometer("");
    setEarningsByPlatform({});
    setExpenses([]);
    router.refresh();
  }

  if (inProgressShift) {
    return (
      <form onSubmit={handleEnd} className="flex flex-col gap-4 rounded-card border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Square size={18} className="text-primary" />
          <h2 className="text-sm font-semibold text-secondary">{t("endTitle")}</h2>
        </div>
        {error && <p className="text-sm text-status-urgent">{error}</p>}

        <FormField label={t("endOdometer")} htmlFor="quick-end-odometer" required helperText={t("startOdometerWas", { value: inProgressShift.start_odometer })}>
          <LifeOSInput
            id="quick-end-odometer"
            type="number"
            min={inProgressShift.start_odometer}
            required
            value={endOdometer}
            onChange={(e) => setEndOdometer(e.target.value)}
          />
        </FormField>

        <div className="flex flex-col gap-3">
          {inProgressShift.platforms.map((platform) => (
            <div key={platform} className="grid grid-cols-3 gap-2">
              <FormField label={t(`platformOptions.${platform}`)} htmlFor={`earning-gross-${platform}`}>
                <LifeOSInput
                  id={`earning-gross-${platform}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={t("gross")}
                  value={earningsFor(platform).gross}
                  onChange={(e) => setEarningsFor(platform, "gross", e.target.value)}
                />
              </FormField>
              <FormField label={t("tips")} htmlFor={`earning-tips-${platform}`}>
                <LifeOSInput
                  id={`earning-tips-${platform}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={earningsFor(platform).tips}
                  onChange={(e) => setEarningsFor(platform, "tips", e.target.value)}
                />
              </FormField>
              <FormField label={t("bonuses")} htmlFor={`earning-bonuses-${platform}`}>
                <LifeOSInput
                  id={`earning-bonuses-${platform}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={earningsFor(platform).bonuses}
                  onChange={(e) => setEarningsFor(platform, "bonuses", e.target.value)}
                />
              </FormField>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-secondary">{t("expensesOptional")}</p>
          {expenses.map((row, i) => (
            <div key={i} className="flex gap-2">
              <LifeOSSelect
                value={row.category}
                onChange={(e) => setExpenses(expenses.map((r, idx) => (idx === i ? { ...r, category: e.target.value as GigExpenseCategory } : r)))}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`expenseCategoryOptions.${c}`)}
                  </option>
                ))}
              </LifeOSSelect>
              <LifeOSInput
                type="number"
                min={0}
                step="0.01"
                placeholder={t("amount")}
                value={row.amount}
                onChange={(e) => setExpenses(expenses.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))}
              />
              <button type="button" onClick={() => setExpenses(expenses.filter((_, idx) => idx !== i))} className="min-h-11 min-w-11 shrink-0 text-muted hover:text-status-urgent">
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExpenses([...expenses, { category: "fuel", amount: "" }])}
            className="flex w-fit items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus size={14} /> {t("addExpense")}
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? t("saving") : t("endButton")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleStart} className="flex flex-col gap-4 rounded-card border border-surface bg-white p-4">
      <div className="flex items-center gap-2">
        <Play size={18} className="text-primary" />
        <h2 className="text-sm font-semibold text-secondary">{t("startTitle")}</h2>
      </div>
      {error && <p className="text-sm text-status-urgent">{error}</p>}

      <FormField label={t("startOdometer")} htmlFor="quick-start-odometer" required>
        <LifeOSInput id="quick-start-odometer" type="number" min={0} required value={startOdometer} onChange={(e) => setStartOdometer(e.target.value)} />
      </FormField>

      {vehicles.length > 0 && (
        <FormField label={t("vehicle")} htmlFor="quick-start-vehicle" optional>
          <LifeOSSelect id="quick-start-vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">{t("noVehicle")}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nickname ?? [v.year, v.make, v.model].filter(Boolean).join(" ") ?? v.id}
              </option>
            ))}
          </LifeOSSelect>
        </FormField>
      )}

      <div>
        <p className="mb-1.5 text-sm font-medium text-secondary">
          {t("platforms")}
          <span className="ml-0.5 text-status-urgent" aria-hidden="true">*</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {GIG_PLATFORMS.map((platform) => (
            <LifeOSCheckbox
              key={platform}
              label={t(`platformOptions.${platform}`)}
              checked={platforms.includes(platform)}
              onChange={(e) => setPlatforms(e.target.checked ? [...platforms, platform] : platforms.filter((p) => p !== platform))}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? t("saving") : t("startButton")}
      </button>
    </form>
  );
}
