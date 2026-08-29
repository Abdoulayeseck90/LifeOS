"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

// Form Redesign spec, Section 3/17/26: every field gets a real visible
// label (never placeholder-only), a clear required marker or an
// "Optional" tag, and — when present — an accessible error message
// (red text + icon, associated via aria-describedby) or muted helper
// text. This is the one wrapper every LifeOSInput/Select/Textarea/
// Checkbox field should sit inside. `children` must be a single form
// control — id/aria-describedby/aria-invalid are cloned onto it
// automatically so the caller only has to set `htmlFor`.
export function FormField({
  label,
  htmlFor,
  required,
  optional,
  helperText,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const messageId = htmlFor ? `${htmlFor}-message` : undefined;

  const control =
    isValidElement(children) && (error || helperText || htmlFor)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id: htmlFor,
          "aria-describedby": error || helperText ? messageId : undefined,
          "aria-invalid": error ? true : undefined,
        })
      : children;

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-secondary">
        {label}
        {required && (
          <span className="ml-0.5 text-status-urgent" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="ml-1.5 text-xs font-normal text-muted">({t("optional")})</span>}
      </label>

      {control}

      {error ? (
        <p id={messageId} className="flex items-center gap-1 text-xs text-status-urgent">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p id={messageId} className="text-xs text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
