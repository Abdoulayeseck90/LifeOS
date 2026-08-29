// Form Redesign spec, Section 14: a true/false switch, ON/OFF visually
// obvious — not just a subtle color change. role="switch" + aria-checked
// for screen readers (Section 26).
export function LifeOSToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex min-h-11 min-w-[3.25rem] items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-primary bg-primary" : "border-slate-300 bg-white"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-8 border border-primary" : "translate-x-1 border border-slate-300"
        }`}
      />
    </button>
  );
}
