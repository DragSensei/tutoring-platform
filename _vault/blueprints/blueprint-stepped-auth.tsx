import React from "react";

/**
 * Stepped Auth Page Orchestrator (≤ 25 lines).
 * Focused, distraction-free container with warm tactile paper boundaries.
 */
import { SteppedAuthCard } from "./_components/SteppedAuthCard";

export default function AuthPage({
  searchParams,
}: {
  searchParams: { step?: string; id?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBFBF9] px-4 py-12">
      <div className="w-full max-w-md">
        <SteppedAuthCard currentStep={searchParams.step || "identity"} identifier={searchParams.id} />
      </div>
    </div>
  );
}
