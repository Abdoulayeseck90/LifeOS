"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import type { GigVehicle, GigVehicleMaintenance, GigMaintenanceType } from "@/types/work/entities";
import type { PersonalDocument } from "@/types/core/entities";
import { FormField } from "@/components/core/form/form-field";
import { LifeOSInput } from "@/components/core/form/lifeos-input";
import { LifeOSSelect } from "@/components/core/form/lifeos-select";
import { formatCurrency } from "@/lib/work/gig-format";
import { GigReceiptAttachment } from "@/components/work/gig-receipt-attachment";

const MAINTENANCE_TYPES: GigMaintenanceType[] = ["oil_change", "tire_rotation", "tire_replacement", "brake_service", "repair", "other"];

function VehicleAddForm({ onAdded }: { onAdded: () => void }) {
  const t = useTranslations("gigDriving.vehicle");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/work/gig-driving/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        year: year ? Number(year) : undefined,
        nickname: nickname.trim() || undefined,
      }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(t("saveError"));
      return;
    }
    setMake("");
    setModel("");
    setYear("");
    setNickname("");
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-card border border-surface bg-white p-4">
      <h2 className="text-sm font-semibold text-secondary">{t("addTitle")}</h2>
      {error && <p className="text-sm text-status-urgent">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FormField label={t("nickname")} htmlFor="vehicle-nickname" optional>
          <LifeOSInput id="vehicle-nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </FormField>
        <FormField label={t("year")} htmlFor="vehicle-year" optional>
          <LifeOSInput id="vehicle-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </FormField>
        <FormField label={t("make")} htmlFor="vehicle-make" optional>
          <LifeOSInput id="vehicle-make" type="text" value={make} onChange={(e) => setMake(e.target.value)} />
        </FormField>
        <FormField label={t("model")} htmlFor="vehicle-model" optional>
          <LifeOSInput id="vehicle-model" type="text" value={model} onChange={(e) => setModel(e.target.value)} />
        </FormField>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 w-fit rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? t("saving") : t("addButton")}
      </button>
    </form>
  );
}

function MaintenanceSection({
  vehicleId,
  records,
  documentsByMaintenanceId,
  onChanged,
}: {
  vehicleId: string;
  records: GigVehicleMaintenance[];
  documentsByMaintenanceId: Record<string, PersonalDocument[]>;
  onChanged: () => void;
}) {
  const t = useTranslations("gigDriving.vehicle");
  const locale = useLocale();
  const [type, setType] = useState<GigMaintenanceType>("oil_change");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await fetch("/api/work/gig-driving/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_id: vehicleId, type, date, cost: cost ? Number(cost) : undefined }),
    });
    setSubmitting(false);
    setCost("");
    onChanged();
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteMaintenanceConfirm"))) return;
    await fetch(`/api/work/gig-driving/maintenance/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-surface pt-3">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <LifeOSSelect value={type} onChange={(e) => setType(e.target.value as GigMaintenanceType)}>
          {MAINTENANCE_TYPES.map((mt) => (
            <option key={mt} value={mt}>
              {t(`maintenanceTypeOptions.${mt}`)}
            </option>
          ))}
        </LifeOSSelect>
        <LifeOSInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <LifeOSInput type="number" min={0} step="0.01" placeholder={t("cost")} value={cost} onChange={(e) => setCost(e.target.value)} className="w-28" />
        <button type="submit" disabled={submitting} className="flex min-h-11 items-center gap-1 rounded border border-slate-300 px-3 text-sm text-secondary hover:bg-surface disabled:opacity-50">
          <Plus size={14} /> {t("addMaintenanceButton")}
        </button>
      </form>

      {records.length === 0 ? (
        <p className="text-xs text-muted">{t("noMaintenance")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {records.map((record) => (
            <li key={record.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <span className="text-secondary">
                  {t(`maintenanceTypeOptions.${record.type}`)} — {new Date(`${record.date}T00:00:00`).toLocaleDateString(locale)}
                  {record.cost != null ? ` · ${formatCurrency(record.cost)}` : ""}
                </span>
                <div className="mt-1">
                  <GigReceiptAttachment relatedGigMaintenanceId={record.id} documents={documentsByMaintenanceId[record.id] ?? []} />
                </div>
              </div>
              <button type="button" onClick={() => handleDelete(record.id)} className="min-h-11 min-w-11 shrink-0 text-muted hover:text-status-urgent" aria-label={t("delete")}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GigVehicleTab({
  vehicles,
  maintenanceByVehicle,
  documentsByMaintenanceId,
}: {
  vehicles: GigVehicle[];
  maintenanceByVehicle: Record<string, GigVehicleMaintenance[]>;
  documentsByMaintenanceId: Record<string, PersonalDocument[]>;
}) {
  const t = useTranslations("gigDriving.vehicle");
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDeleteVehicle(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    await fetch(`/api/work/gig-driving/vehicles/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <VehicleAddForm onAdded={refresh} />

      {vehicles.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vehicles.map((vehicle) => {
            const expanded = expandedId === vehicle.id;
            return (
              <li key={vehicle.id} className="rounded-card border border-surface bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-secondary">
                    {vehicle.nickname ?? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") ?? t("unnamed")}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : vehicle.id)}
                      className="flex min-h-11 items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {t("maintenance")} {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      className="min-h-11 min-w-11 text-muted hover:text-status-urgent"
                      aria-label={t("delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <MaintenanceSection
                    vehicleId={vehicle.id}
                    records={maintenanceByVehicle[vehicle.id] ?? []}
                    documentsByMaintenanceId={documentsByMaintenanceId}
                    onChanged={refresh}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
