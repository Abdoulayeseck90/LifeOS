"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { LucideIcon } from "lucide-react";

// Shared tab primitive (Nutrition Redesign spec, Section 6/7) — built on
// Radix Tabs rather than hand-rolled, same rationale as Modal wrapping
// Radix Dialog: free roving-tabindex keyboard navigation (arrow keys
// between triggers, Enter/Space to activate) and proper ARIA
// tab/tabpanel semantics, which a plain button strip (see
// diagnostic-test-category-browser.tsx) doesn't get. Horizontally
// scrollable rather than wrapping (Section 7: "Do NOT wrap tabs into
// multiple rows").
export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <TabsPrimitive.List className="mb-6 flex gap-1 overflow-x-auto border-b border-surface" aria-label="Tabs">
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({
  value,
  icon: Icon,
  children,
}: {
  value: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className="flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-medium text-muted transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-primary sm:px-4"
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      {children}
    </TabsPrimitive.Trigger>
  );
}
