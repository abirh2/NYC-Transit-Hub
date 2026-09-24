"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Accessibility, ArrowUpRight, LoaderCircle } from "lucide-react";

import type { EquipmentOutage } from "@/types/mta";
import { apiFetch } from "@/lib/api/client";

type StatusState = "loading" | "ready" | "error";

export function StationAccessibilityStatus({ stationName }: { stationName: string }) {
  const [state, setState] = useState<StatusState>("loading");
  const [resolvedStation, setResolvedStation] = useState(stationName);
  const [outages, setOutages] = useState<EquipmentOutage[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`/api/elevators?stationName=${encodeURIComponent(stationName)}&limit=3`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as {
          success: boolean;
          data?: { equipment: EquipmentOutage[] };
        };
        if (!response.ok || !payload.success || !payload.data) throw new Error("Outage feed unavailable");
        setOutages(payload.data.equipment);
        setResolvedStation(stationName);
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResolvedStation(stationName);
          setState("error");
        }
      });
    return () => controller.abort();
  }, [stationName]);

  const params = new URLSearchParams({ station: stationName });

  if (state === "loading" || resolvedStation !== stationName) {
    return (
      <p role="status" className="flex min-h-11 items-center gap-2 text-sm text-foreground/60">
        <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Checking accessibility…
      </p>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-foreground/65">Accessibility status unavailable</p>
        <Link className="font-semibold text-primary hover:underline" href={`/accessibility?${params.toString()}`}>
          Check details
        </Link>
      </div>
    );
  }

  if (outages.length === 0) return null;

  const elevatorCount = outages.filter((outage) => outage.equipmentType === "ELEVATOR").length;
  const primary = outages[0];
  const label = elevatorCount === outages.length
    ? `${outages.length} current elevator outage${outages.length === 1 ? "" : "s"}`
    : `${outages.length} current equipment outage${outages.length === 1 ? "" : "s"}`;

  return (
    <aside className="rounded-lg bg-state-advisory/10 px-4 py-3 text-sm text-foreground" aria-label="Station accessibility">
      <div className="flex items-start gap-3">
        <Accessibility className="mt-0.5 h-5 w-5 shrink-0 text-state-advisory" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{label}</p>
          {primary.serving && <p className="mt-0.5 capitalize text-foreground/70">{primary.serving}</p>}
          <Link
            href={`/accessibility?${params.toString()}`}
            className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            View accessibility details
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
