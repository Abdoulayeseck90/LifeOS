import { getTranslations } from "next-intl/server";
import { LoadingState } from "@/components/core/loading-state";

// Route-level Suspense fallback for the whole authenticated section
// (Master Redesign Section 23) — Next.js renders this automatically
// while any (app)/* page's server data fetch is in flight, avoiding a
// blank screen / sudden layout jump.
export default async function AppLoading() {
  const t = await getTranslations("common");
  return <LoadingState label={t("loading")} />;
}
