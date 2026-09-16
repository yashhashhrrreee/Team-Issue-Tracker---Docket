import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

// Shared shell for Login/Register/New Project/Join Project — all four
// mockups use the identical centered-mark + 420px-card frame.
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-9">
        <BrandMark />

        <div className="w-full border border-rule bg-paper-raised px-6 py-8 sm:px-10 sm:py-11">
          <h1 className="mb-1.5 font-heading text-2xl font-semibold text-ink sm:text-[28px]">
            {title}
          </h1>
          <p className="mb-6 font-body text-[13px] text-ink-soft sm:mb-8 sm:text-sm">{subtitle}</p>

          {children}

          <p className="mt-[18px] text-center font-body text-[13px] text-ink-soft sm:mt-5 sm:text-sm">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}
