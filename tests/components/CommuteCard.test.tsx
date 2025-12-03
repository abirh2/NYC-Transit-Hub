/**
 * CommuteCard Dashboard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CommuteCard } from "@/components/dashboard/CommuteCard";

// Mock useAuth hook
vi.mock("@/components/auth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/components/auth";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CommuteCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows loading state while auth is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<CommuteCard />);

    // Should show skeleton loaders with .rounded class
    expect(document.querySelectorAll(".rounded").length).toBeGreaterThan(0);
  });

  it("shows sign in prompt when not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: false,
          isConfigured: false,
        },
      }),
    });

    render(<CommuteCard />);

    await waitFor(() => {
      expect(screen.getByText(/Sign in to set up your commute/)).toBeInTheDocument();
    });
  });

  it("shows setup prompt when authenticated but not configured", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as never,
      session: {} as never,
      isLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: false,
        },
      }),
    });

    render(<CommuteCard />);

    await waitFor(() => {
      expect(screen.getByText("Set up your commute")).toBeInTheDocument();
    });
  });

  it("displays commute data when configured", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as never,
      session: {} as never,
      isLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: true,
          leaveIn: "15 min",
          arriveBy: "9:00 AM",
          duration: 40,
          route: "F → A → 1",
          status: "on_time",
        },
      }),
    });

    render(<CommuteCard />);

    await waitFor(() => {
      expect(screen.getByText("15 min")).toBeInTheDocument();
    });

    expect(screen.getByText("On time")).toBeInTheDocument();
    expect(screen.getByText(/Leave to arrive by 9:00 AM/)).toBeInTheDocument();
    expect(screen.getByText("via F → A → 1")).toBeInTheDocument();
    expect(screen.getByText("40 min")).toBeInTheDocument();
  });

  it("shows running late status", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as never,
      session: {} as never,
      isLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: true,
          leaveIn: "Now",
          arriveBy: "9:20 AM",
          duration: 50,
          route: "A",
          status: "delayed",
        },
      }),
    });

    render(<CommuteCard />);

    await waitFor(() => {
      expect(screen.getByText("Running late")).toBeInTheDocument();
    });
  });

  it("shows error state when route cannot be fetched", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as never,
      session: {} as never,
      isLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: true,
          error: "No route found",
        },
      }),
    });

    render(<CommuteCard />);

    await waitFor(() => {
      expect(screen.getByText("Unable to fetch route")).toBeInTheDocument();
    });
  });

  it("links to commute page", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true, data: { isAuthenticated: false } }),
    });

    render(<CommuteCard />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/commute");
  });
});
