"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface GuidanceAccordionItem {
  id: string;
  // Pre-rendered on the server (icon + label together) rather than a
  // raw component reference — a Lucide icon component is a function,
  // and functions can't cross the Server->Client Component boundary
  // (only already-rendered elements/plain data can).
  title: ReactNode;
  content: ReactNode;
}

// Redesign Nutrition spec, Section 7/22: "Do not display liver
// education... all expanded simultaneously. Use hierarchy." One
// section open at a time, everything else one click away — the same
// pattern already used for NutritionEducation/HydrationEducation, but
// generalized to hold full rendered components (server or client) as
// each item's content instead of plain text.
export function GuidanceAccordion({ items, defaultOpenId }: { items: GuidanceAccordionItem[]; defaultOpenId?: string }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);

  return (
    <div className="flex flex-col divide-y divide-surface rounded-card border border-surface bg-white">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-secondary"
            >
              <span className="flex items-center gap-2">{item.title}</span>
              <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <div className="px-4 pb-4">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
