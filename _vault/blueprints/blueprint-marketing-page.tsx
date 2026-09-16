import React from "react";

/**
 * Editorial Marketing Page Orchestrator (≤ 30 lines).
 * Designed with high typographic contrast and generous editorial pacing.
 */
import { HeroSection } from "./_components/HeroSection";
import { PillarsSection } from "./_components/PillarsSection";
import { AcademyIntel } from "./_components/AcademyIntel";

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[#FBFBF9] text-stone-900">
      <HeroSection />
      <PillarsSection />
      <AcademyIntel />
    </main>
  );
}
