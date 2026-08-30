import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { toggleFavorite } from "@/services/core/dua-user-data";

// Section 19: favoriting is a private per-user overlay (dua_user_data),
// never a column on the shared Dua row — works identically for a
// built-in or a personal Dua.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userData = await toggleFavorite(id);
    return NextResponse.json({ data: userData });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
  }
}
