import { useTranslations } from "next-intl";
import type { Appointment } from "@/types/health/entities";

// Maps appointment status to the semantic status colors defined in
// tailwind.config.ts (Spec Section 51.4.1) — never a raw hex value here.
const STATUS_CLASSES: Record<Appointment["status"], string> = {
  scheduled: "bg-status-attention/10 text-status-attention",
  completed: "bg-status-normal/10 text-status-normal",
  cancelled: "bg-status-inactive/10 text-status-inactive",
  no_show: "bg-status-urgent/10 text-status-urgent",
};

export function AppointmentStatusBadge({ status }: { status: Appointment["status"] }) {
  const t = useTranslations("appointments.status");

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {t(status)}
    </span>
  );
}
