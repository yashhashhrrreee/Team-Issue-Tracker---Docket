import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssigneeAvatar } from "./AssigneeAvatar";

describe("AssigneeAvatar", () => {
  it("renders the assignee's initial, uppercased", () => {
    render(<AssigneeAvatar username="rosa" />);
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("handles the unassigned (null) case with a dashed placeholder", () => {
    render(<AssigneeAvatar username={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("—")).toHaveClass("border-dashed");
  });

  it("same username always renders the same background color", () => {
    const { container: a } = render(<AssigneeAvatar username="marcus" />);
    const { container: b } = render(<AssigneeAvatar username="marcus" />);
    const colorOf = (c: HTMLElement) => (c.querySelector("span") as HTMLElement).style.backgroundColor;
    expect(colorOf(a)).toBe(colorOf(b));
  });

  it("is circular (rounded-full) — the documented exception to the flat design rule", () => {
    render(<AssigneeAvatar username="rosa" />);
    expect(screen.getByText("R")).toHaveClass("rounded-full");
  });
});
