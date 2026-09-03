import { redirect } from "next/navigation";

// Appointments moved to the global Calendar (Calendar spec: "Move the
// primary Appointments functionality out of HEALTH -> Appointments and
// make it part of CALENDAR"). Kept as a redirect rather than deleted
// outright so an old bookmark/link to this URL doesn't 404.
export default async function AppointmentsRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/calendar`);
}
