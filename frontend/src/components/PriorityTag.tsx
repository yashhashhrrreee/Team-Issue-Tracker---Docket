import type { IssuePriority } from "../api/types";

const LEVEL_CLASSES: Record<IssuePriority, string> = {
  Urgent: "border-red text-red",
  High: "border-red text-red",
  Medium: "border-blue text-blue",
  Low: "border-blue-light text-blue-light",
};

export function PriorityTag({ level }: { level: IssuePriority }) {
  return (
    <span
      className={`inline-block border px-[7px] py-[2px] font-mono text-[10px] uppercase tracking-[0.06em] ${LEVEL_CLASSES[level]}`}
    >
      {level}
    </span>
  );
}
