import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Show the red underline without an inline message — for screens
   * (e.g. Join Project) that show one shared error line below multiple fields. */
  invalid?: boolean;
}

// Underline style per mockups: no box, 1px rule underline, color-only
// change to ink on focus (no thickness change), mono uppercase label.
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, invalid = false, className = "", ...props }, ref) => {
    const hasError = invalid || Boolean(error);
    return (
      <label className="block">
        <span className="block font-mono text-[11px] tracking-[0.08em] uppercase text-ink-soft">
          {label}
        </span>
        <input
          ref={ref}
          className={`mt-2 block w-full border-0 border-b bg-transparent px-0.5 pt-1.5 pb-2.5 font-body text-base text-ink outline-none placeholder:text-[#9AA6BB] ${
            hasError ? "border-red focus:border-red" : "border-rule focus:border-ink"
          } ${className}`}
          aria-invalid={hasError}
          {...props}
        />
        {hasError && <span className="mt-1 block text-xs text-red">{error}</span>}
      </label>
    );
  }
);
InputField.displayName = "InputField";
