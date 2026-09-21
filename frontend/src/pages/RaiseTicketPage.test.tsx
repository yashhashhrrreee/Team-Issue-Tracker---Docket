import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { RaiseTicketPage } from "./RaiseTicketPage";
import { server } from "../test/server";

const API = "http://localhost:5000";
const PROJECT_ID = "proj-1";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/issues/new?projectId=${PROJECT_ID}`]}>
        <Routes>
          <Route path="/issues/new" element={<RaiseTicketPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  server.use(
    http.get(`${API}/api/projects/${PROJECT_ID}`, () =>
      HttpResponse.json({ id: PROJECT_ID, key: "ROC", name: "Rocket Squad" })
    ),
    http.get(`${API}/api/projects/${PROJECT_ID}/members`, () =>
      HttpResponse.json([{ id: "u1", username: "bob", role: "Developer", open_ticket_count: 0 }])
    )
  );
});

// Testing.md §3: "Raise a ticket form" — empty title blocks submit and
// shows the inline error; filling required fields submits the correct
// payload shape to the API.
describe("RaiseTicketPage form", () => {
  it("submitting with an empty title shows the inline error and does not call the API", async () => {
    let createWasCalled = false;
    server.use(
      http.post(`${API}/api/projects/${PROJECT_ID}/issues`, () => {
        createWasCalled = true;
        return HttpResponse.json({ id: "issue-1", number: 1 }, { status: 201 });
      })
    );

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /raise ticket/i }));

    expect(await screen.findByText("Title is required.")).toBeInTheDocument();
    expect(createWasCalled).toBe(false);
  });

  it("filling required fields and submitting calls the API with the correct payload shape", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(`${API}/api/projects/${PROJECT_ID}/issues`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          { id: "issue-1", number: 7, project_id: PROJECT_ID },
          { status: 201 }
        );
      })
    );

    renderPage();

    const titleInput = await screen.findByLabelText("Title");
    await userEvent.type(titleInput, "Fuel gauge misreads under 10%");
    await userEvent.type(screen.getByLabelText("Description"), "Gauge shows 0%.");
    await userEvent.click(screen.getByRole("button", { name: "Decision" }));
    await userEvent.click(screen.getByRole("button", { name: "Urgent" }));

    await userEvent.click(screen.getByRole("button", { name: /raise ticket/i }));

    await waitFor(() => expect(capturedBody).not.toBeNull());
    expect(capturedBody).toMatchObject({
      title: "Fuel gauge misreads under 10%",
      description: "Gauge shows 0%.",
      category: "Decision",
      priority: "Urgent",
      assignee_id: null,
    });

    expect(await screen.findByText("Ticket stamped")).toBeInTheDocument();
  });
});
