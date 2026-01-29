import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
  api: {},
  filesApi: {},
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.authApi.me).mockRejectedValue(new Error("No token"));
  });

  it("renders without crashing", () => {
    render(<App />);
    // App mounts successfully - Router, AuthProvider, etc. all work
    expect(document.body).toBeInTheDocument();
  });

  it("renders home content when at root", async () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    await waitFor(
      () => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});
