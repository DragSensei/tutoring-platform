import React from "react";

/**
 * Tactical Portal Orchestrator (≤ 30 lines).
 * Minimalist dashboard frame that keeps focus on tabular data and balances.
 */
import { PortalHeader } from "./_components/PortalHeader";
import { PortalMainView } from "./_components/PortalMainView";

export default async function PortalPage() {
  const initialData = { status: "ACTIVE" };

  return (
    <div className="min-h-screen bg-[#FBFBF9]">
      <PortalHeader title="Portal Overview" />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PortalMainView data={initialData} />
      </main>
    </div>
  );
}
