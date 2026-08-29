import { createClient } from "@/lib/supabase/server";
import type {
  MealLogEntry,
  NutritionRestriction,
  Meal,
  MealCuisine,
  NutritionPreferences,
  ShoppingListItem,
  ShoppingListCategory,
  HydrationLogEntry,
  Food,
} from "@/types/health/entities";

// Follows the Conditions pattern (src/services/health/conditions.ts).
// Two tables per Spec Section 51.1 (V1 scope: meal logging + clinician
// restrictions only, no macro tracking).

export async function listMealLogEntries(): Promise<MealLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_log_entries")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return data as MealLogEntry[];
}

export async function getMealLogEntry(id: string): Promise<MealLogEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("meal_log_entries").select("*").eq("id", id).maybeSingle();

  if (error) throw error;
  return data as MealLogEntry | null;
}

export async function createMealLogEntry(
  input: Pick<MealLogEntry, "date" | "meal_type" | "description"> &
    Partial<Omit<MealLogEntry, "id" | "user_id" | "date" | "meal_type" | "description" | "created_at">>
): Promise<MealLogEntry> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("meal_log_entries")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as MealLogEntry;
}

export async function updateMealLogEntry(
  id: string,
  input: Partial<Omit<MealLogEntry, "id" | "user_id" | "created_at">>
): Promise<MealLogEntry> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("meal_log_entries").update(input).eq("id", id).select().single();

  if (error) throw error;
  return data as MealLogEntry;
}

export async function deleteMealLogEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_log_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function listNutritionRestrictions(): Promise<NutritionRestriction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nutrition_restrictions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as NutritionRestriction[];
}

export async function getNutritionRestriction(id: string): Promise<NutritionRestriction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("nutrition_restrictions").select("*").eq("id", id).maybeSingle();

  if (error) throw error;
  return data as NutritionRestriction | null;
}

export async function createNutritionRestriction(
  input: Pick<NutritionRestriction, "restriction" | "source"> &
    Partial<Omit<NutritionRestriction, "id" | "user_id" | "restriction" | "source" | "created_at">>
): Promise<NutritionRestriction> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("nutrition_restrictions")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as NutritionRestriction;
}

export async function updateNutritionRestriction(
  id: string,
  input: Partial<Omit<NutritionRestriction, "id" | "user_id" | "created_at">>
): Promise<NutritionRestriction> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nutrition_restrictions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as NutritionRestriction;
}

export async function deleteNutritionRestriction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("nutrition_restrictions").delete().eq("id", id);
  if (error) throw error;
}

// Senegal-Focused Liver-Conscious Nutrition System — meals is shared
// curated content (Spec Section 23), readable by any authenticated
// user, same pattern as test_definitions.
export async function listMeals(cuisine?: MealCuisine): Promise<Meal[]> {
  const supabase = await createClient();
  let query = supabase.from("meals").select("*");
  if (cuisine) query = query.eq("cuisine", cuisine);

  const { data, error } = await query.order("meal_type", { ascending: true });
  if (error) throw error;
  return data as Meal[];
}

export async function getMeal(id: string): Promise<Meal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("meals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Meal | null;
}

export async function listMealsByIds(ids: string[]): Promise<Meal[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("meals").select("*").in("id", ids);
  if (error) throw error;
  return data as Meal[];
}

// Redesign Nutrition spec, Section 17 — individual food items, same
// global/curated-content pattern as listMeals().
export async function listFoods(): Promise<Food[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("foods").select("*").order("name_en", { ascending: true });
  if (error) throw error;
  return data as Food[];
}

export async function getFood(id: string): Promise<Food | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("foods").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Food | null;
}

export async function getNutritionPreferences(): Promise<NutritionPreferences | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("nutrition_preferences").select("*").maybeSingle();
  if (error) throw error;
  return data as NutritionPreferences | null;
}

// Section 20: personalization only, never turned into a medical
// prescription — one row per user, created on first save or updated
// on every subsequent one.
export async function upsertNutritionPreferences(
  input: Partial<Omit<NutritionPreferences, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<NutritionPreferences> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("nutrition_preferences")
    .upsert({ ...input, user_id: user.id }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;
  return data as NutritionPreferences;
}

export async function listShoppingListItems(): Promise<ShoppingListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_list_items")
    .select("*")
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as ShoppingListItem[];
}

// Section 16: "Generate Shopping List" from the weekly plan — inserts
// whatever isn't already on the list (case-insensitive match on name)
// rather than duplicating an item the user already has.
export async function addShoppingListItems(
  items: { name: string; category: ShoppingListCategory; source?: string }[]
): Promise<ShoppingListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const existing = await listShoppingListItems();
  const existingNames = new Set(existing.map((item) => item.name.trim().toLowerCase()));
  const toInsert = items.filter((item) => !existingNames.has(item.name.trim().toLowerCase()));

  if (toInsert.length === 0) return [];

  const { data, error } = await supabase
    .from("shopping_list_items")
    .insert(toInsert.map((item) => ({ ...item, user_id: user.id })))
    .select();

  if (error) throw error;
  return data as ShoppingListItem[];
}

export async function updateShoppingListItem(id: string, input: { purchased: boolean }): Promise<ShoppingListItem> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shopping_list_items").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as ShoppingListItem;
}

export async function deleteShoppingListItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearPurchasedShoppingListItems(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_list_items").delete().eq("purchased", true);
  if (error) throw error;
}

// Hydration & Drinks, Section 28 — logs recent entries (used to
// compute today's total client-side, same pattern as
// computeDailyNutritionSummary over meal_log_entries).
export async function listHydrationLogEntries(): Promise<HydrationLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hydration_log_entries")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as HydrationLogEntry[];
}

export async function addHydrationLogEntry(
  input: Pick<HydrationLogEntry, "date" | "beverage_type" | "amount_ml">
): Promise<HydrationLogEntry> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("hydration_log_entries")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as HydrationLogEntry;
}

export async function deleteHydrationLogEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("hydration_log_entries").delete().eq("id", id);
  if (error) throw error;
}
