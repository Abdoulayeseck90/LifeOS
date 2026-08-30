import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { shoppingListItemsInputSchema } from "@/lib/validation/health";
import { listShoppingListItems, addShoppingListItems } from "@/services/health/nutrition";

// Senegal-Focused Liver-Conscious Nutrition System, Section 16.

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const items = await listShoppingListItems();
    return NextResponse.json({ data: items });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load shopping list" }, { status: 500 });
  }
}

// Accepts an array so "Generate Shopping List" can add a whole week's
// ingredients in one request.
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = shoppingListItemsInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const items = await addShoppingListItems(parsed.data);
    return NextResponse.json({ data: items }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add shopping list items" }, { status: 500 });
  }
}
