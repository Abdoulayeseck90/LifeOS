import { getTranslations } from "next-intl/server";
import { HeartPulse, Droplets, Candy, Wheat, Wine, type LucideIcon } from "lucide-react";
import { listConditions } from "@/services/health/conditions";
import { hasLiverRelatedCondition } from "@/lib/health/liver-guidance";
import { LiverConsciousEating } from "@/components/health/liver-conscious-eating";
import { HepatitisBNutrition } from "@/components/health/hepatitis-b-nutrition";
import { SaltSodiumInfo } from "@/components/health/salt-sodium-info";
import { SugarInfo } from "@/components/health/sugar-info";
import { FiberInfo } from "@/components/health/fiber-info";
import { AlcoholLiverCard } from "@/components/health/alcohol-liver-card";
import { GuidanceAccordion, type GuidanceAccordionItem } from "@/components/health/guidance-accordion";

// Icon + label rendered together on the server into a plain element —
// a Lucide icon component is a function, and functions can't be
// passed as props across the Server->Client boundary (only already-
// rendered elements can), so the accordion item's `title` must arrive
// pre-rendered rather than as a separate `icon` reference.
function ItemTitle({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon size={16} className="text-muted" />
      {label}
    </>
  );
}

// Redesign Nutrition spec, Section 7/22: ONE "Health & Nutrition
// Guidance" section, collapsed by default (accordion, one item open at
// a time) — replaces the old always-expanded grid of separate liver/
// sodium/alcohol cards scattered across the page. Section 7: "If the
// user has a condition where relevant, show 'Liver-conscious eating.'"
// — the general healthy-eating content (already condition-agnostic)
// is always shown, but is retitled "Liver-Conscious Eating" and paired
// with the hepatitis-B-specific disclaimer only when a liver-related
// condition is actually on file; otherwise it's titled generically.
export async function HealthAndNutritionGuidance() {
  const t = await getTranslations("nutrition.healthGuidance");
  const conditions = await listConditions();
  const liverRelated = hasLiverRelatedCondition(conditions.map((c) => c.name));

  const items: GuidanceAccordionItem[] = [
    {
      id: "eating-pattern",
      title: <ItemTitle icon={HeartPulse} label={liverRelated ? t("liverConsciousTitle") : t("healthyEatingPatternTitle")} />,
      content: <LiverConsciousEating />,
    },
    ...(liverRelated
      ? [
          {
            id: "hepatitis-b",
            title: <ItemTitle icon={HeartPulse} label={t("hepatitisBTitle")} />,
            content: <HepatitisBNutrition />,
          },
        ]
      : []),
    { id: "sodium", title: <ItemTitle icon={Droplets} label={t("sodiumTitle")} />, content: <SaltSodiumInfo /> },
    { id: "sugar", title: <ItemTitle icon={Candy} label={t("sugarTitle")} />, content: <SugarInfo /> },
    { id: "fiber", title: <ItemTitle icon={Wheat} label={t("fiberTitle")} />, content: <FiberInfo /> },
    { id: "alcohol", title: <ItemTitle icon={Wine} label={t("alcoholTitle")} />, content: <AlcoholLiverCard /> },
  ];

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("title")}</h2>
      <GuidanceAccordion items={items} />
    </section>
  );
}
