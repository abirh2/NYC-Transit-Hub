import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisiblePolling } from "@/lib/hooks/useVisiblePolling";

function Harness({ onPoll }: { onPoll: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const { isOnline } = useVisiblePolling(onPoll, 1_000, enabled);

  return (
    <>
      <p>{isOnline ? "online" : "offline"}</p>
      <button onClick={() => setEnabled(false)}>disable</button>
    </>
  );
}

describe("useVisiblePolling", () => {
  let visibilityState: DocumentVisibilityState;

  beforeEach(() => {
    vi.useFakeTimers();
    visibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibilityState,
    );
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls at the requested interval while visible", () => {
    const onPoll = vi.fn();
    render(<Harness onPoll={onPoll} />);

    act(() => vi.advanceTimersByTime(3_000));

    expect(onPoll).toHaveBeenCalledTimes(3);
  });

  it("pauses while hidden and refreshes once when visible again", () => {
    const onPoll = vi.fn();
    render(<Harness onPoll={onPoll} />);

    visibilityState = "hidden";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(3_000));
    expect(onPoll).not.toHaveBeenCalled();

    visibilityState = "visible";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(onPoll).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(1_000));
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it("pauses offline and refreshes once on reconnect", () => {
    const onPoll = vi.fn();
    render(<Harness onPoll={onPoll} />);

    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByText("offline")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2_000));
    expect(onPoll).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new Event("online")));
    expect(screen.getByText("online")).toBeInTheDocument();
    expect(onPoll).toHaveBeenCalledTimes(1);
  });

  it("cleans up polling when disabled", () => {
    const onPoll = vi.fn();
    render(<Harness onPoll={onPoll} />);

    act(() => screen.getByRole("button", { name: "disable" }).click());
    act(() => vi.advanceTimersByTime(2_000));

    expect(onPoll).not.toHaveBeenCalled();
  });
});
