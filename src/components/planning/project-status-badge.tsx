import { useTranslations } from "next-intl";
import type { ProjectStatus } from "@/types/core/entities";

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  idea: "bg-status-inactive/10 text-status-inactive",
  planning: "bg-status-info/10 text-status-info",
  active: "bg-status-normal/10 text-status-normal",
  completed: "bg-primary/10 text-primary",
  archived: "bg-status-inactive/10 text-status-inactive",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations("planning.projectStatus");
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>{t(status)}</span>;
}
