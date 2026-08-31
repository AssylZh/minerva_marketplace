import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Items from "./Items";
import { AuthProvider } from "../context/AuthContext";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

function renderWithProviders(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  localStorage.setItem("mm_auth_user", JSON.stringify({ city: "Tokyo" }));
  global.fetch = jest.fn((url) => {
    const urlText = String(url);
    if (String(url).includes("/cities")) {
      return Promise.resolve({ ok: true, json: async () => ["Tokyo", "Berlin"] });
    }
    if (/[?&]page=2(&|$)/.test(urlText)) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 2,
              title: "Desk Lamp",
              price: 2000,
              condition: "Good",
              location: "Tokyo",
              created_at: "2026-04-01T00:00:00Z",
              listing_type: "offering",
            },
          ],
          has_more: false,
        }),
      });
    }
    if (String(url).includes("listing_type=request")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 3,
              title: "Need Textbook",
              price: 0,
              condition: "Fair",
              location: "Berlin",
              created_at: "2026-04-02T00:00:00Z",
              listing_type: "request",
            },
          ],
          has_more: false,
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 1,
            title: "Microwave",
            price: 4500,
            condition: "Good",
            location: "Tokyo",
            created_at: "2026-04-01T00:00:00Z",
            listing_type: "offering",
          },
        ],
        has_more: true,
      }),
    });
  });
});

test("browse tabs, filters, and pagination work", async () => {
  renderWithProviders(<Items />);

  await waitFor(() => expect(screen.getByText(/Microwave/i)).toBeInTheDocument());

  await userEvent.click(screen.getByRole("button", { name: /load more/i }));
  await waitFor(() => expect(screen.getByText(/Desk Lamp/i)).toBeInTheDocument());

  await userEvent.click(screen.getByRole("button", { name: /requests/i }));
  await waitFor(() => expect(screen.getByText(/Need Textbook/i)).toBeInTheDocument());
  expect(global.fetch.mock.calls.some(([url]) => String(url).includes("listing_type=request"))).toBe(true);

  await userEvent.selectOptions(screen.getByLabelText("Filter by category"), "Furniture");
  await waitFor(() =>
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes("category=Furniture"))).toBe(true)
  );
});
