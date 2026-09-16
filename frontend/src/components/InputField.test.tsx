import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InputField } from "./InputField";

describe("InputField", () => {
  it("default state: rule-colored border, no error message", () => {
    render(<InputField label="Username" />);
    const input = screen.getByLabelText("Username", { exact: false });
    expect(input).toHaveClass("border-rule");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input.parentElement?.querySelector("span.text-red")?.textContent).toBeFalsy();
  });

  it("error state: red border and displays the error message", () => {
    render(<InputField label="Username" error="Username is required." />);
    const input = screen.getByLabelText("Username", { exact: false });
    expect(input).toHaveClass("border-red");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Username is required.")).toBeInTheDocument();
  });

  it("invalid=true shows the red border without requiring a message", () => {
    render(<InputField label="Invite code" invalid />);
    const input = screen.getByLabelText("Invite code", { exact: false });
    expect(input).toHaveClass("border-red");
    // no message text was passed, so the message slot renders no visible text
    expect(input.parentElement?.querySelector("span.text-red")?.textContent).toBeFalsy();
  });

  it("renders the mono uppercase label", () => {
    render(<InputField label="Email" />);
    expect(screen.getByText("Email")).toHaveClass("uppercase");
  });
});
