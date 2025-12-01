/**
 * CommuteSummary Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CommuteSummary } from "@/components/commute";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CommuteSummary", () => {
  const mockOnSetupClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<CommuteSummary />);

    // Should show skeleton loaders
    expect(document.querySelectorAll("[data-slot='base']").length).toBeGreaterThan(0);
  });

  it("shows setup prompt when not configured", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: false,
        },
      }),
    });

    render(<CommuteSummary onSetupClick={mockOnSetupClick} />);

    await waitFor(() => {
      expect(screen.getByText("Set Up Your Commute")).toBeInTheDocument();
    });

    expect(screen.getByText(/Configure your home and work addresses/)).toBeInTheDocument();
  });

  it("calls onSetupClick when Configure Now button is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: false,
        },
      }),
    });

    render(<CommuteSummary onSetupClick={mockOnSetupClick} />);

    await waitFor(() => {
      expect(screen.getByText("Configure Now")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Configure Now"));
    expect(mockOnSetupClick).toHaveBeenCalled();
  });

  it("displays commute summary when configured", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: true,
          leaveIn: "12 min",
          arriveBy: "9:00 AM",
          duration: 35,
          route: "F → A",
          status: "on_time",
          delayMinutes: 0,
          targetArrival: "9:00 AM",
        },
      }),
    });

    render(<CommuteSummary />);

    await waitFor(() => {
      expect(screen.getByText("12 min")).toBeInTheDocument();
    });

    expect(screen.getByText("On Time")).toBeInTheDocument();
    expect(screen.getByText("to arrive by 9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("35 min")).toBeInTheDocument();
    expect(screen.getByText("F → A")).toBeInTheDocument();
  });

  it("shows delayed status when running late", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: true,
          leaveIn: "Now",
          arriveBy: "9:15 AM",
          duration: 45,
          route: "A → 1",
          status: "delayed",
          delayMinutes: 15,
          targetArrival: "9:00 AM",
        },
      }),
    });

    render(<CommuteSummary />);

    await waitFor(() => {
      expect(screen.getByText(/Running Late/)).toBeInTheDocument();
    });

    expect(screen.getByText(/15 min/)).toBeInTheDocument();
  });

  it("shows error message when API returns error", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          isAuthenticated: true,
          isConfigured: true,
          error: "Unable to fetch trip data",
        },
      }),
    });

    render(<CommuteSummary />);

    await waitFor(() => {
      expect(screen.getByText("Unable to fetch trip data")).toBeInTheDocument();
    });
  });

  it("refreshes data when refresh button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            isAuthenticated: true,
            isConfigured: true,
            leaveIn: "10 min",
            status: "on_time",
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            isAuthenticated: true,
            isConfigured: true,
            leaveIn: "8 min",
            status: "on_time",
          },
        }),
      });

    render(<CommuteSummary />);

    await waitFor(() => {
      expect(screen.getByText("10 min")).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByRole("button", { name: "" });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText("8 min")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

