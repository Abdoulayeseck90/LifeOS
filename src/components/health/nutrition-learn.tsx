import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { NutritionEducation } from "@/components/health/nutrition-education";
import { HydrationEducation } from "@/components/health/hydration-education";

// Redesign Nutrition spec, Section 15: one "Learn" section holding the
// existing nutrition + hydration FAQ accordions — collapsed by default,
// never 10+ expanded questions on the main page.
export async function NutritionLearn() {
  const t = await getTranslations("nutrition.learn");

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen size={18} className="text-muted" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("title")}</h2>
      </div>
      <div className="flex flex-col gap-4">
        <NutritionEducation />
        <HydrationEducation />
      </div>
    </section>
  );
}
