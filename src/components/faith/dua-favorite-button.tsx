"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";

// Section 19: favorite/save a Dua — a private per-user overlay, works
// the same for a built-in or personal Dua.
export function DuaFavoriteButton({ duaId, favorited }: { duaId: string; favorited: boolean }) {
  const t = useTranslations("faith.dua");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    const response = await fetch(`/api/faith/duas/${duaId}/favorite`, { method: "POST" });
    setPending(false);
    if (response.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-pressed={favorited}
      className={`inline-flex min-h-11 items-center gap-1.5 text-sm disabled:opacity-50 ${favorited ? "text-status-urgent" : "text-secondary hover:text-status-urgent"}`}
    >
      <Heart size={16} fill={favorited ? "currentColor" : "none"} />
      {favorited ? t("saved") : t("save")}
    </button>
  );
}
