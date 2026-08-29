import { useTranslations } from "next-intl";
import type { GoalStatus } from "@/types/core/entities";

const STATUS_CLASSES: Record<GoalStatus, string> = {
  not_started: "bg-status-inactive/10 text-status-inactive",
  in_progress: "bg-status-info/10 text-status-info",
  completed: "bg-primary/10 text-primary",
  archived: "bg-status-inactive/10 text-status-inactive",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const t = useTranslations("planning.goalStatus");
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>{t(status)}</span>;
}
