import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignIn from "./SignIn";
import * as api from "@/lib/api";
import { AuthProvider } from "@/contexts/AuthContext";

vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

function renderSignIn() {
  return render(
    <AuthProvider>
      <SignIn />
    </AuthProvider>
  );
}

describe("SignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.authApi.me).mockRejectedValue(new Error("No token"));
  });

  it("renders sign in form", async () => {
    renderSignIn();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("shows error on failed login", async () => {
    vi.mocked(api.authApi.login).mockRejectedValue({
      response: { data: { detail: "Invalid credentials" } },
    });
    renderSignIn();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "test@test.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("has link to sign up", async () => {
    renderSignIn();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
    });
  });
});
