"use client";

import { useTranslations } from "next-intl";
import type { Business, Goal, Project } from "@/types/core/entities";
import type { OfflineTask } from "@/lib/offline/db";
import { TaskCard } from "@/components/planning/task-card";
import { useOfflineList } from "@/lib/offline/use-offline-list";

// Offline Strategy spec, Section 2: "View tasks" with no "recently
// accessed" qualifier (unlike Notes) — the full list is cached on every
// online load, not just whatever's been individually opened.
export function TasksList({
  tasks,
  projects,
  goals,
  businesses,
}: {
  tasks: OfflineTask[];
  projects: Project[];
  goals: Goal[];
  businesses: Business[];
}) {
  const tOffline = useTranslations("common.offline");
  const { items: mergedTasks, isOffline } = useOfflineList<OfflineTask>("tasks", tasks);

  return (
    <div>
      {isOffline && <p className="mb-4 rounded bg-status-attention/10 px-3 py-2 text-xs text-status-attention">{tOffline("showingCached")}</p>}

      <div className="flex flex-col gap-3">
        {mergedTasks.map((task) => (
          <TaskCard key={task.id} task={task} projects={projects} goals={goals} businesses={businesses} />
        ))}
      </div>
    </div>
  );
}
