import { render, screen, waitFor } from "@testing-library/react";
import Item from "./Item";
import { AuthProvider } from "../context/AuthContext";

const mockNavigate = jest.fn();

jest.mock("../context/AuthContext", () => ({
  ...jest.requireActual("../context/AuthContext"),
  useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useParams: () => ({ itemID: "1" }),
  useNavigate: () => mockNavigate,
}));

const { useAuth } = require("../context/AuthContext");

beforeEach(() => {
  useAuth.mockReturnValue({
    user: { id: 42, token: "token123" },
    isAuthenticated: true,
  });
  global.fetch = jest.fn((url) => {
    if (String(url).includes("/api/items/1")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 1,
          seller_id: 42,
          title: "Microwave",
          price: 4500,
          condition: "Good",
          location: "Tokyo",
          description: "Great condition",
          status: "active",
          image_url: null,
          seller: {
            first_name: "Ada",
            last_name: "Lovelace",
            city: "Tokyo",
            cohort: "M27",
            created_at: "2024-01-01T00:00:00Z",
          },
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
});

test("item detail shows seller profile and owner action buttons", async () => {
  render(
    <AuthProvider>
      <Item />
    </AuthProvider>
  );

  await waitFor(() => expect(screen.getByRole("heading", { name: /microwave/i })).toBeInTheDocument());

  expect(screen.getByText(/seller/i)).toBeInTheDocument();
  expect(screen.getByText(/Ada Lovelace/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /edit listing/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /delete listing/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /mark as sold/i })).toBeInTheDocument();
});
