import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { listUserDuaRoutines } from "@/services/core/dua-routines";
import { listCompletionsForDate } from "@/services/core/dua-completions";
import { listDuas } from "@/services/core/duas";
import { listDuaReminderSettings } from "@/services/core/dua-reminder-settings";
import { DuaAddButton } from "@/components/faith/dua-add-button";
import { DuaCard } from "@/components/faith/dua-card";
import { DuaReminderSettingsForm } from "@/components/faith/dua-reminder-settings-form";
import { DuaRoutineOverview } from "@/components/faith/dua-routine-overview";
import { SectionHeader } from "@/components/core/section-header";

// Section 2/34: the Dua dashboard — daily progress, per-block
// breakdown, Today's Recommended, My Duas. "Today's Recommended" draws
// only from the verified built-in library (Section 16) — which starts
// empty (Section 33: no fabricated religious content), so that section
// legitimately shows nothing yet until real content is imported.
// The routine/progress/My-Duas portion is a client component
// (DuaRoutineOverview) so it can stay usable offline (Offline Strategy
// spec, Section 3) — "Today's Recommended" and reminder settings don't
// need that, so they stay server-rendered here.
export const dynamic = "force-dynamic";

export default async function DuaOverviewPage() {
  const t = await getTranslations("faith.dua");
  const today = new Date().toISOString().slice(0, 10);

  const [routines, completions, duas, reminderSettings] = await Promise.all([
    listUserDuaRoutines(),
    listCompletionsForDate(today),
    listDuas(),
    listDuaReminderSettings(),
  ]);

  const myDuas = duas.filter((d) => !d.is_builtin);
  const recommended = duas.filter((d) => d.is_builtin).slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <DuaAddButton />
          <Link
            href="/faith/dua/explore"
            className="inline-flex min-h-11 items-center rounded border border-surface px-4 py-2 text-sm font-medium text-secondary hover:bg-surface"
          >
            {t("exploreDuas")}
          </Link>
          <Link href="/faith/dua/history" className="inline-flex min-h-11 items-center px-2 text-sm text-primary hover:underline">
            {t("viewHistory")}
          </Link>
        </div>
      </div>

      <DuaRoutineOverview routines={routines} completions={completions} myDuas={myDuas} />

      <div className="mb-8">
        <SectionHeader title={t("todaysRecommended")} />
        {recommended.length === 0 ? (
          <p className="text-sm text-muted">{t("noRecommended")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recommended.map((dua) => (
              <DuaCard key={dua.id} dua={dua} />
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader title={t("reminders")} />
        <DuaReminderSettingsForm settings={reminderSettings} />
      </div>
    </div>
  );
}
