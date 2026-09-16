import type { IssueCategory } from "../api/types";

// Filled, not outlined — the one visual difference from PriorityTag
// (Testing.md's component list calls this out explicitly).
const CATEGORY_CLASSES: Record<IssueCategory, string> = {
  Technical: "bg-blue text-paper",
  Managerial: "bg-blue-light text-ink", // blue-light bg only ~2.9:1 with white — fails WCAG AA
  Decision: "bg-red text-paper",
};

export function CategoryTag({ category }: { category: IssueCategory }) {
  return (
    <span
      className={`inline-block px-[7px] py-[2px] font-mono text-[10px] uppercase tracking-[0.06em] ${CATEGORY_CLASSES[category]}`}
    >
      {category}
    </span>
  );
}
