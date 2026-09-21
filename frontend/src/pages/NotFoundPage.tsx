import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex h-14 shrink-0 items-center border-b border-rule px-4 sm:h-16 sm:px-12">
        <BrandMark />
      </header>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <div className="mb-3.5 font-mono text-sm tracking-[0.1em] text-ink-soft">404</div>
          <h1 className="mb-3 font-heading text-xl font-semibold text-ink sm:text-[28px]">
            This ticket doesn't exist.
          </h1>
          <p className="mb-6 font-body text-sm text-ink-soft sm:mb-7 sm:text-[15px]">
            It may have moved, or the link is out of date.
          </p>
          {/* Mockup's copy is ticket-specific ("Back to Board"), but a
              catch-all 404 has no known project — routes to the Projects
              picker instead, the nearest universal destination. */}
          <Link
            to="/projects"
            className="border-b border-ink pb-0.5 font-body text-sm font-semibold text-ink"
          >
            Back to Board
          </Link>
        </div>
      </div>
    </div>
  );
}
