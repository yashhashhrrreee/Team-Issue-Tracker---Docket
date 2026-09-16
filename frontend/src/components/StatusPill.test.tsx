import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill";
import type { IssueStatus } from "../api/types";

describe("StatusPill", () => {
  const statuses: IssueStatus[] = ["Open", "In Progress", "Done"];

  it.each(statuses)("renders %s", (status) => {
    render(<StatusPill status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });

  // Testing.md §3: confirms it stays neutral/ink regardless of status —
  // unlike Priority/Category, there is no color-coding by value at all.
  it.each(statuses)("%s stays neutral ink, never colored", (status) => {
    render(<StatusPill status={status} />);
    const el = screen.getByText(status);
    expect(el).toHaveClass("text-ink");
    expect(el).toHaveClass("border-ink");
    expect(el.className).not.toMatch(/text-red|text-blue|bg-red|bg-blue/);
  });
});
