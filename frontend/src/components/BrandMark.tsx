// Mockups render the standalone wordmark (auth screens, loading screen)
// as mono uppercase letter-spaced text, not Fraunces — Fraunces is
// reserved for in-card headings ("Sign in", "Create account", etc.).
export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      className={`font-mono uppercase tracking-[0.22em] text-ink ${
        size === "lg" ? "text-[15px]" : "text-[13px] md:text-[14px]"
      }`}
    >
      Docket
    </span>
  );
}
