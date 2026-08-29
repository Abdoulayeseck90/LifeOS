import { useTranslations } from "next-intl";
import type { TaskStatus } from "@/types/core/entities";

const STATUS_CLASSES: Record<TaskStatus, string> = {
  open: "bg-status-inactive/10 text-status-inactive",
  in_progress: "bg-status-info/10 text-status-info",
  done: "bg-primary/10 text-primary",
  cancelled: "bg-status-inactive/10 text-status-inactive",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = useTranslations("planning.taskStatus");
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>{t(status)}</span>;
}
