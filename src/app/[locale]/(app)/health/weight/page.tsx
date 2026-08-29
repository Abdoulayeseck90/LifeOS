import { redirect } from "next/navigation";

// Weight tracking moved into the new Vitals page (health/vitals/page.tsx)
// per the Vitals spec's "avoid duplicating Weight" instruction — this
// route is kept only so old links/bookmarks to /health/weight still land
// somewhere real instead of 404ing.
export default async function WeightPageRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/health/vitals`);
}
