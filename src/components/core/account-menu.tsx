"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { CircleUser } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";

function initialsOf(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }
  return email[0]?.toUpperCase() ?? "?";
}

// Settings already contains the Profile section, so this menu links
// straight to Settings rather than duplicating a separate "Profile"
// entry that would point at the same page.
export function AccountMenu({ displayName, email }: { displayName: string | null; email: string }) {
  const tNav = useTranslations("nav");
  const initials = initialsOf(displayName, email);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={displayName ?? email}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground hover:opacity-90"
        >
          {initials || <CircleUser size={20} />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-card border border-surface bg-white p-2 shadow-lg"
        >
          <div className="px-2 py-2">
            <p className="truncate text-sm font-medium text-secondary">{displayName ?? email}</p>
            {displayName && <p className="truncate text-xs text-muted">{email}</p>}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-surface" />
          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="block cursor-pointer rounded px-2 py-2 text-sm text-secondary hover:bg-surface"
            >
              {tNav("settings")}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
