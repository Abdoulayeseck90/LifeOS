import { getTranslations } from "next-intl/server";
import { listDuas } from "@/services/core/duas";
import { DuaAddButton } from "@/components/faith/dua-add-button";
import { DuaExploreList } from "@/components/faith/dua-explore-list";

export const dynamic = "force-dynamic";

export default async function DuaExplorePage() {
  const t = await getTranslations("faith.dua.explore");
  const duas = await listDuas();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-secondary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <DuaAddButton />
      </div>

      <DuaExploreList duas={duas} />
    </div>
  );
}
