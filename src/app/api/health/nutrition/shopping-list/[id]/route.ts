import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shoppingListItemUpdateSchema } from "@/lib/validation/health";
import { updateShoppingListItem, deleteShoppingListItem } from "@/services/health/nutrition";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const parsed = shoppingListItemUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const item = await updateShoppingListItem(id, parsed.data);
    return NextResponse.json({ data: item });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update shopping list item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await deleteShoppingListItem(id);
    return NextResponse.json({ data: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete shopping list item" }, { status: 500 });
  }
}
