"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShoppingBasket } from "lucide-react";
import type { ShoppingListCategory, ShoppingListItem } from "@/types/health/entities";
import { LifeOSCheckbox } from "@/components/core/form/lifeos-checkbox";

// Senegal-Focused Liver-Conscious Nutrition spec, Section 16: grouped
// by category, checkable, persisted per user so it survives reloads.
const CATEGORY_ORDER: ShoppingListCategory[] = [
  "vegetables",
  "fruits",
  "fish",
  "protein",
  "grains",
  "legumes",
  "nuts_seeds",
  "seasonings",
  "dairy",
  "other",
];

export function ShoppingList({ items }: { items: ShoppingListItem[] }) {
  const t = useTranslations("nutrition.shoppingList");
  const router = useRouter();

  const grouped = useMemo(() => {
    const groups = new Map<ShoppingListCategory, ShoppingListItem[]>();
    for (const item of items) {
      const existing = groups.get(item.category);
      if (existing) existing.push(item);
      else groups.set(item.category, [item]);
    }
    return CATEGORY_ORDER.filter((c) => groups.has(c)).map((category) => ({ category, items: groups.get(category) as ShoppingListItem[] }));
  }, [items]);

  async function togglePurchased(item: ShoppingListItem) {
    await fetch(`/api/health/nutrition/shopping-list/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchased: !item.purchased }),
    });
    router.refresh();
  }

  async function removeItem(id: string) {
    await fetch(`/api/health/nutrition/shopping-list/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="mb-8 rounded-card border border-surface bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShoppingBasket size={18} className="text-muted" />
        <h2 className="text-sm font-semibold text-secondary">{t("title")}</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(({ category, items: categoryItems }) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t(`categories.${category}`)}</p>
              <ul className="mt-1.5 flex flex-col">
                {categoryItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <LifeOSCheckbox
                      label={<span className={item.purchased ? "text-muted line-through" : "text-secondary"}>{item.name}</span>}
                      checked={item.purchased}
                      onChange={() => togglePurchased(item)}
                    />
                    <button type="button" onClick={() => removeItem(item.id)} className="min-h-11 text-xs text-muted hover:text-status-urgent">
                      {t("remove")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
