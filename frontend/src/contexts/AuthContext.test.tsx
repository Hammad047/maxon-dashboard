import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

function TestConsumer() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      {user && <span data-testid="user-email">{user.email}</span>}
      <button onClick={() => login("test@test.com", "password")}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within AuthProvider"
    );
  });

  it("shows loading initially when no token", async () => {
    vi.mocked(api.authApi.me).mockRejectedValue(new Error("Unauthorized"));
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
  });

  it("loads user when token exists", async () => {
    localStorage.setItem("access_token", "token");
    vi.mocked(api.authApi.me).mockResolvedValue({
      data: {
        id: 1,
        email: "user@test.com",
        full_name: "Test User",
        role: "viewer",
      },
    } as Awaited<ReturnType<typeof api.authApi.me>>);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("user@test.com");
    });
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
  });

  it("login updates state", async () => {
    vi.mocked(api.authApi.me).mockRejectedValue(new Error("No token"));
    vi.mocked(api.authApi.login).mockResolvedValue({
      data: {
        access_token: "new-token",
        refresh_token: "new-refresh",
        token_type: "bearer",
      },
    } as Awaited<ReturnType<typeof api.authApi.login>>);
    vi.mocked(api.authApi.me).mockResolvedValue({
      data: {
        id: 1,
        email: "logged@test.com",
        full_name: null,
        role: "viewer",
      },
    } as Awaited<ReturnType<typeof api.authApi.me>>);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(api.authApi.login).toHaveBeenCalledWith("test@test.com", "password");
    });
  });
});
