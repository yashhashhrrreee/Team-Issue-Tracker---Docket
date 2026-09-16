import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketCard } from "./TicketCard";

describe("TicketCard", () => {
  it("renders id, title, priority, and category", () => {
    render(
      <TicketCard
        ticketId="ROC-1"
        title="Fuel gauge misreads under 10%"
        priority="High"
        category="Technical"
        assigneeUsername="bob"
      />
    );
    expect(screen.getByText("ROC-1")).toBeInTheDocument();
    expect(screen.getByText("Fuel gauge misreads under 10%")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument(); // bob's avatar initial
  });

  // Testing.md §3: left-border color matches priority.
  it.each([
    ["Urgent", "border-l-red"],
    ["High", "border-l-red"],
    ["Medium", "border-l-blue"],
    ["Low", "border-l-blue-light"],
  ] as const)("left border for %s priority is %s", (priority, borderClass) => {
    const { container } = render(
      <TicketCard ticketId="ROC-1" title="x" priority={priority} />
    );
    expect(container.firstChild).toHaveClass(borderClass);
  });

  it("hideAssignee omits the avatar entirely (Member Profile usage)", () => {
    render(<TicketCard ticketId="ROC-1" title="x" priority="Low" hideAssignee />);
    expect(screen.queryByTitle(/./)).not.toBeInTheDocument();
  });

  it("category is optional — renders fine without one", () => {
    render(<TicketCard ticketId="ROC-1" title="x" priority="Low" />);
    expect(screen.getByText("ROC-1")).toBeInTheDocument();
  });
});
