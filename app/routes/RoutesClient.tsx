import { Suspense } from "react";

import { RouteFinder } from "@/components/accessibility";
import { PageContainer, PageHeader } from "@/components/layout";
import { LoadingSkeleton } from "@/components/ui";

export function RoutesClient() {
  return (
    <PageContainer>
      <PageHeader
        title="Plan"
        description="Enter any NYC street address, station, or landmark. Results use the MTA trip planner and currently available transit data."
      />
      <Suspense fallback={<LoadingSkeleton variant="card" count={2} />}>
        <RouteFinder />
      </Suspense>
    </PageContainer>
  );
}
