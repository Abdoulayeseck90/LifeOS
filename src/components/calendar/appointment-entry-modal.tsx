"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Appointment, Condition, RecurrenceEditScope } from "@/types/health/entities";
import { isRecurringMaster } from "@/lib/calendar/appointment-status";
import { Modal } from "@/components/core/modal";
import { AppointmentDetail } from "@/components/calendar/appointment-detail";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import { RecurrenceScopeDialog } from "@/components/calendar/recurrence-scope-dialog";

// Clicking any Calendar entry opens this: a read-only detail view with
// Edit/Delete actions at the bottom. A compact calendar entry (a
// one-line chip in Month/Week view) has no room for the three separate
// View/Edit/Delete text links the old, roomier AppointmentCard used —
// this consolidates the same three actions behind one click instead.
// Known trade-off: unlike RecordFormModal (used elsewhere for
// create/edit), this doesn't confirm before discarding an in-progress
// edit — accepted here to keep the view/edit mode switch simple.
export function AppointmentEntryModal({
  open,
  onOpenChange,
  appointment,
  occurrenceStart,
  occurrenceEnd = null,
  conditions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  occurrenceStart: string;
  occurrenceEnd?: string | null;
  conditions: Condition[];
}) {
  const t = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const tCalendar = useTranslations("calendar");
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deleteScopeOpen, setDeleteScopeOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Same synchronous re-entrancy guard as AppointmentForm.submit() -- a
  // double-click/double-tap on Delete before React re-renders could
  // otherwise fire two DELETE requests for the same row.
  const deleteInFlightRef = useRef(false);

  const isPartOfSeries = isRecurringMaster(appointment);

  function handleOpenChange(next: boolean) {
    if (!next) setMode("view");
    onOpenChange(next);
  }

  // Previously swallowed a failed response entirely -- if the DELETE
  // request came back non-2xx for any reason, this did nothing at all:
  // no error, no closed modal, no visible reaction to the click.
  async function handleDelete(scope: RecurrenceEditScope) {
    if (deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;
    setDeleteError(null);
    try {
      const response = await fetch(`/api/calendar/appointments/${appointment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, occurrence_start: occurrenceStart }),
      });
      if (response.ok) {
        handleOpenChange(false);
        router.refresh();
        return;
      }
      const responseBody = await response.json().catch(() => null);
      setDeleteError(typeof responseBody?.error === "string" ? responseBody.error : t("form.saveError"));
    } finally {
      deleteInFlightRef.current = false;
    }
  }

  const title = appointment.title ?? appointment.provider_name ?? t("form.title");

  if (mode === "edit") {
    return (
      <Modal open={open} onOpenChange={handleOpenChange} title={t("form.editTitle")}>
        <AppointmentForm
          appointment={appointment}
          occurrenceStart={occurrenceStart}
          conditions={conditions}
          closeAfterSave={() => handleOpenChange(false)}
          requestClose={() => setMode("view")}
          registerDirty={() => undefined}
        />
      </Modal>
    );
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title={title}>
      <AppointmentDetail appointment={appointment} occurrenceStart={occurrenceStart} occurrenceEnd={occurrenceEnd} />
      {deleteError && <p className="mt-2 text-sm text-status-urgent">{deleteError}</p>}
      <div className="mt-4 flex justify-end gap-4 border-t border-surface pt-4">
        <button type="button" onClick={() => setMode("edit")} className="text-sm text-primary hover:underline">
          {tCommon("edit")}
        </button>
        <button
          type="button"
          onClick={() => (isPartOfSeries ? setDeleteScopeOpen(true) : handleDelete("series"))}
          className="text-sm text-status-urgent hover:underline"
        >
          {tCommon("delete")}
        </button>
      </div>

      <RecurrenceScopeDialog
        open={deleteScopeOpen}
        onOpenChange={setDeleteScopeOpen}
        title={tCalendar("recurrenceScope.deleteTitle")}
        onConfirm={handleDelete}
      />
    </Modal>
  );
}
