import { useEffect, useState } from "react";
import { Spinner } from "@heroui/react";

import { CrowdingList } from "@/components/crowding/CrowdingList";
import { ErrorState } from "@/components/ui";
import { PageContainer } from "@/components/layout";
import { apiFetch } from "@/lib/api/client";
import type { RouteCrowding } from "@/types/mta";

export default function NativeCrowdingPage() {
  const [data, setData] = useState<RouteCrowding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void apiFetch("/api/metrics/crowding", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Crowding data is unavailable.");
        const payload = await response.json() as RouteCrowding[];
        setData(payload);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Crowding data is unavailable.");
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <PageContainer width="wide">
      {error ? (
        <ErrorState title="Crowding unavailable" description={error} />
      ) : data ? (
        <CrowdingList data={data} enhanced={false} />
      ) : (
        <div className="flex min-h-[40dvh] items-center justify-center">
          <Spinner label="Loading crowding estimates" />
        </div>
      )}
    </PageContainer>
  );
}
