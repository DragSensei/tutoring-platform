import { AcademyIntel } from './_components/AcademyIntel';
import { HeroSection } from './_components/HeroSection';
import { PillarsSection } from './_components/PillarsSection';

export default function HomePage() {
  return (
    <div className="landing-page -mx-4 bg-canvas-subtle text-text-primary sm:-mx-6">
      <HeroSection />
      <PillarsSection />
      <AcademyIntel />
    </div>
  );
}
