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
    render(<CommuteSetup onSave={mockOnSave} isNew />);

    expect(screen.getByText("Add New Commute")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter starting address...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter destination address...")).toBeInTheDocument();
    expect(screen.getByText("Target Arrival Time")).toBeInTheDocument();
  });

  it("renders with initial data when provided", () => {
    const initialData = {
      label: "Work Commute",
      fromAddress: "123 Main St, Brooklyn",
      fromLat: 40.6782,
      fromLon: -73.9442,
      toAddress: "456 Broadway, Manhattan",
      toLat: 40.7614,
      toLon: -73.9776,
      targetArrival: "09:30",
      isDefault: false,
    };

    render(<CommuteSetup initialData={initialData} onSave={mockOnSave} />);

    expect(screen.getByDisplayValue("Work Commute")).toBeInTheDocument();
    expect(screen.getByDisplayValue("09:30")).toBeInTheDocument();
  });

  it("disables save button when addresses are not geocoded", () => {
    render(<CommuteSetup onSave={mockOnSave} isNew />);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("enables save button when both addresses are geocoded", () => {
    const initialData = {
      label: "Commute",
      fromAddress: "123 Main St",
      fromLat: 40.6782,
      fromLon: -73.9442,
      toAddress: "456 Broadway",
      toLat: 40.7614,
      toLon: -73.9776,
      targetArrival: "09:00",
      isDefault: false,
    };

    render(<CommuteSetup initialData={initialData} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it("shows location confirmed messages when addresses are geocoded", () => {
    const initialData = {
      label: "Commute",
      fromAddress: "123 Main St",
      fromLat: 40.6782,
      fromLon: -73.9442,
      toAddress: "456 Broadway",
      toLat: 40.7614,
      toLon: -73.9776,
      targetArrival: null,
      isDefault: false,
    };

    render(<CommuteSetup initialData={initialData} onSave={mockOnSave} />);

    const confirmations = screen.getAllByText("Location confirmed");
    expect(confirmations).toHaveLength(2);
  });

  it("calls onSave when form is submitted", async () => {
    const initialData = {
      label: "Work",
      fromAddress: "123 Main St",
      fromLat: 40.6782,
      fromLon: -73.9442,
      toAddress: "456 Broadway",
      toLat: 40.7614,
      toLon: -73.9776,
      targetArrival: "09:00",
      isDefault: false,
    };

    // Mock API response with the commute object
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          commute: {
            id: "123",
            label: "Work",
            fromAddress: "123 Main St",
            fromLat: 40.6782,
            fromLon: -73.9442,
            toAddress: "456 Broadway",
            toLat: 40.7614,
            toLon: -73.9776,
            targetArrival: "09:00",
            isDefault: false,
          },
        },
      }),
    });

    render(<CommuteSetup initialData={initialData} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/commute/settings", expect.objectContaining({
      method: "POST",
    }));
  });

  it("shows label input for naming the commute", () => {
    render(<CommuteSetup onSave={mockOnSave} isNew />);

    expect(screen.getByPlaceholderText("e.g., Morning Commute, Work → Home...")).toBeInTheDocument();
  });

  it("shows default toggle option", () => {
    const initialData = {
      label: "Work",
      fromAddress: "123 Main St",
      fromLat: 40.6782,
      fromLon: -73.9442,
      toAddress: "456 Broadway",
      toLat: 40.7614,
      toLon: -73.9776,
      targetArrival: "09:00",
      isDefault: false,
    };

    render(<CommuteSetup initialData={initialData} onSave={mockOnSave} />);

    expect(screen.getByText("Show on dashboard")).toBeInTheDocument();
  });
});
