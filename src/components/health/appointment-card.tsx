"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Appointment, Condition } from "@/types/health/entities";
import { AppointmentStatusBadge } from "@/components/health/appointment-status-badge";
import { AppointmentForm } from "@/components/health/appointment-form";
import { AppointmentDetail } from "@/components/health/appointment-detail";
import { Modal } from "@/components/core/modal";
import { RecordFormModal } from "@/components/core/record-form-modal";
import { ConfirmDialog } from "@/components/core/confirm-dialog";

// Section 6/7/8: a compact summary by default, with View/Edit/Delete as
// the only way to see the full record or a form — the list itself never
// carries an inline editing form.
export function AppointmentCard({
  appointment,
  conditions,
}: {
  appointment: Appointment;
  conditions: Condition[];
}) {
  const t = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const response = await fetch(`/api/health/appointments/${appointment.id}`, { method: "DELETE" });
    setDeleting(false);
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-card border border-surface bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-secondary">{appointment.provider_name}</p>
          {appointment.specialty && <p className="mt-1 text-sm text-muted">{appointment.specialty}</p>}
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">{t("dateTime")}</dt>
          <dd className="text-secondary">{new Date(appointment.date_time).toLocaleString(locale)}</dd>
        </div>
        {appointment.location && (
          <div>
            <dt className="text-xs text-muted">{t("location")}</dt>
            <dd className="text-secondary">{appointment.location}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex gap-4">
        <button type="button" onClick={() => setDetailOpen(true)} className="text-xs text-primary hover:underline">
          {tCommon("view")}
        </button>

        <RecordFormModal
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-primary hover:underline">
              {tCommon("edit")}
            </button>
          )}
          modalTitle={t("form.editTitle")}
        >
          {(modalProps) => <AppointmentForm conditions={conditions} appointment={appointment} {...modalProps} />}
        </RecordFormModal>

        <ConfirmDialog
          trigger={(open) => (
            <button type="button" onClick={open} className="text-xs text-status-urgent hover:underline">
              {tCommon("delete")}
            </button>
          )}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmMessage")}
          onConfirm={handleDelete}
        />
        {deleting && <span className="text-xs text-muted">{tCommon("loading")}</span>}
      </div>

      <Modal open={detailOpen} onOpenChange={setDetailOpen} title={appointment.provider_name}>
        <AppointmentDetail appointment={appointment} />
      </Modal>
    </div>
  );
}
