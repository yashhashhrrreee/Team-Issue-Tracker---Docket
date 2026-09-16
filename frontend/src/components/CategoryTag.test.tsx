import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryTag } from "./CategoryTag";
import type { IssueCategory } from "../api/types";

describe("CategoryTag", () => {
  const cases: [IssueCategory, string][] = [
    ["Technical", "bg-blue"],
    ["Managerial", "bg-blue-light"],
    ["Decision", "bg-red"],
  ];

  it.each(cases)("renders %s with background class %s", (category, bgClass) => {
    render(<CategoryTag category={category} />);
    expect(screen.getByText(category)).toHaveClass(bgClass);
  });

  // Managerial uses ink text on its light background for AA contrast
  // (Decisions.md) — Technical/Decision stay white-on-dark.
  it("Managerial uses ink text, not white, for contrast", () => {
    render(<CategoryTag category="Managerial" />);
    expect(screen.getByText("Managerial")).toHaveClass("text-ink");
  });
  it("Technical and Decision use white text", () => {
    render(<CategoryTag category="Technical" />);
    expect(screen.getByText("Technical")).toHaveClass("text-paper");
  });

  // Testing.md §3: filled, not outlined — the one visual difference from PriorityTag.
  it("is filled (background), not outlined", () => {
    render(<CategoryTag category="Technical" />);
    const el = screen.getByText("Technical");
    expect(el).not.toHaveClass("border");
    expect(el.className).toMatch(/bg-/);
  });
});
