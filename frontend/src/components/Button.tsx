import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-ink text-paper border border-ink hover:bg-[#15213A]",
  secondary: "bg-transparent text-ink border border-ink hover:bg-paper-raised",
  danger: "bg-transparent text-red border border-red hover:bg-red/10",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-[13px] font-body text-[15px] font-semibold transition-colors disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
