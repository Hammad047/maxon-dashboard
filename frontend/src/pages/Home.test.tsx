import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "./Home";
import { AuthProvider } from "@/contexts/AuthContext";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.authApi.me).mockRejectedValue(new Error("No token"));
  });

  it("renders welcome and sign in / sign up", async () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
  });

  it("renders designed by Hammad Rustam", async () => {
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/designed by hammad rustam/i)).toBeInTheDocument();
    });
  });
});
