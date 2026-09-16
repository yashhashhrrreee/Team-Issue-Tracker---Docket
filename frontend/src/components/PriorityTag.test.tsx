import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriorityTag } from "./PriorityTag";
import type { IssuePriority } from "../api/types";

// Testing.md §3: this is the component that broke in the first design
// pass (uniform blue instead of semantic per-level color) — assert the
// actual rendered color class per level, not just that it renders.
describe("PriorityTag", () => {
  const cases: [IssuePriority, string][] = [
    ["Urgent", "text-red"],
    ["High", "text-red"],
    ["Medium", "text-blue"],
    ["Low", "text-blue-light"],
  ];

  it.each(cases)("renders %s with color class %s", (level, colorClass) => {
    render(<PriorityTag level={level} />);
    const el = screen.getByText(level);
    expect(el).toHaveClass(colorClass);
  });

  it("Urgent and High share the same color (both red)", () => {
    const { unmount } = render(<PriorityTag level="Urgent" />);
    expect(screen.getByText("Urgent")).toHaveClass("text-red");
    unmount();
    render(<PriorityTag level="High" />);
    expect(screen.getByText("High")).toHaveClass("text-red");
  });

  it("is outlined (border), not filled", () => {
    render(<PriorityTag level="Low" />);
    expect(screen.getByText("Low")).toHaveClass("border");
    expect(screen.getByText("Low")).not.toHaveClass("bg-blue-light");
  });
});
