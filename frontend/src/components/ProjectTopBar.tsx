import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { me } from "../api/auth";
import { BrandMark } from "./BrandMark";

interface ProjectTopBarProps {
  projectName?: string;
  projectKey?: string;
  action?: ReactNode;
}

// Desktop shows project name/key inline in the topbar; mobile mockups
// move it to its own row below the bar instead, so this renders both
// and lets CSS pick which one shows.
export function ProjectTopBar({ projectName, projectKey, action }: ProjectTopBarProps) {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: me });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4 sm:h-16 sm:px-12">
        <div className="flex items-center gap-6">
          <BrandMark />
          {projectName && (
            <>
              <div className="hidden h-5 w-px bg-rule sm:block" />
              <div className="hidden items-baseline gap-2 sm:flex">
                <span className="font-heading text-[17px] font-semibold text-ink">
                  {projectName}
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">
                  {projectKey}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2.5 sm:gap-5">
          <span className="hidden font-body text-sm text-ink-soft sm:inline">
            {user?.username}
          </span>
          {action}
        </div>
      </header>
      {projectName && (
        <div className="flex items-baseline gap-2 px-4 pt-3 sm:hidden">
          <span className="font-heading text-base font-semibold text-ink">{projectName}</span>
          <span className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase">
            {projectKey}
          </span>
        </div>
      )}
    </>
  );
}
