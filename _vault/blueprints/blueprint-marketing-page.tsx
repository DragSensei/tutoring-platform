import React from "react";

/**
 * Editorial Marketing Page Orchestrator (≤ 30 lines).
 * Designed with high typographic contrast and generous editorial pacing.
 */
import { HeroSection } from "./_components/HeroSection";
import { PillarsSection } from "./_components/PillarsSection";
import { FeatureGrid } from "./_components/FeatureGrid";

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-canvas text-stone-900">
      <HeroSection />
      <PillarsSection />
      <FeatureGrid />
    </main>
  );
}
