/**
 * CommuteSetup Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommuteSetup } from "@/components/commute";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CommuteSetup", () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders setup form with empty fields", () => {
    render(<CommuteSetup onSave={mockOnSave} />);

    expect(screen.getByText("Configure Your Commute")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your home address...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your work address...")).toBeInTheDocument();
    expect(screen.getByText("Target Arrival Time")).toBeInTheDocument();
  });

  it("renders with initial settings when provided", () => {
    const initialSettings = {
      homeAddress: "123 Main St, Brooklyn",
      homeLat: 40.6782,
      homeLon: -73.9442,
      workAddress: "456 Broadway, Manhattan",
      workLat: 40.7614,
      workLon: -73.9776,
      targetArrival: "09:30",
    };

    render(<CommuteSetup initialSettings={initialSettings} onSave={mockOnSave} />);

    expect(screen.getByDisplayValue("123 Main St, Brooklyn")).toBeInTheDocument();
    expect(screen.getByDisplayValue("456 Broadway, Manhattan")).toBeInTheDocument();
    expect(screen.getByDisplayValue("09:30")).toBeInTheDocument();
  });

  it("disables save button when addresses are not geocoded", () => {
    render(<CommuteSetup onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save commute settings/i });
    expect(saveButton).toBeDisabled();
  });

  it("enables save button when both addresses are geocoded", () => {
    const initialSettings = {
      homeAddress: "123 Main St",
      homeLat: 40.6782,
      homeLon: -73.9442,
      workAddress: "456 Broadway",
      workLat: 40.7614,
      workLon: -73.9776,
      targetArrival: "09:00",
    };

    render(<CommuteSetup initialSettings={initialSettings} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save commute settings/i });
    expect(saveButton).not.toBeDisabled();
  });

  it("shows location confirmed messages when addresses are geocoded", () => {
    const initialSettings = {
      homeAddress: "123 Main St",
      homeLat: 40.6782,
      homeLon: -73.9442,
      workAddress: "456 Broadway",
      workLat: 40.7614,
      workLon: -73.9776,
      targetArrival: null,
    };

    render(<CommuteSetup initialSettings={initialSettings} onSave={mockOnSave} />);

    const confirmations = screen.getAllByText("Location confirmed");
    expect(confirmations).toHaveLength(2);
  });

  it("calls API and onSave when form is submitted", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { isConfigured: true, settings: {} },
      }),
    });

    const initialSettings = {
      homeAddress: "123 Main St",
      homeLat: 40.6782,
      homeLon: -73.9442,
      workAddress: "456 Broadway",
      workLat: 40.7614,
      workLon: -73.9776,
      targetArrival: "09:00",
    };

    render(<CommuteSetup initialSettings={initialSettings} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save commute settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/commute/settings", expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }));
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it("shows error message when save fails", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: false,
        error: "Failed to save settings",
      }),
    });

    const initialSettings = {
      homeAddress: "123 Main St",
      homeLat: 40.6782,
      homeLon: -73.9442,
      workAddress: "456 Broadway",
      workLat: 40.7614,
      workLon: -73.9776,
      targetArrival: "09:00",
    };

    render(<CommuteSetup initialSettings={initialSettings} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save commute settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to save settings")).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("shows success message after successful save", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { isConfigured: true, settings: {} },
      }),
    });

    const initialSettings = {
      homeAddress: "123 Main St",
      homeLat: 40.6782,
      homeLon: -73.9442,
      workAddress: "456 Broadway",
      workLat: 40.7614,
      workLon: -73.9776,
      targetArrival: "09:00",
    };

    render(<CommuteSetup initialSettings={initialSettings} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save commute settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Settings saved successfully!")).toBeInTheDocument();
    });
  });
});

