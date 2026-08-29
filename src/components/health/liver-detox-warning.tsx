import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";

// Hydration & Drinks spec, Section 35: no herbal product, supplement,
// or traditional drink is a hepatitis B treatment — no lemon water,
// ginger, bissap, baobab, or tea "cleanses" or "repairs" the liver.
export async function LiverDetoxWarning() {
  const t = await getTranslations("nutrition.liverDetoxWarning");

  return (
    <div className="rounded-card border border-status-attention/30 bg-status-attention/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShieldAlert size={18} className="text-status-attention" />
        <h3 className="text-sm font-semibold text-secondary">{t("title")}</h3>
      </div>
      <p className="text-sm text-secondary">{t("body")}</p>
    </div>
  );
}
