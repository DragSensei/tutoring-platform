import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
      <div className="relative w-16 h-16 mx-auto">
        <Image
          src="/logo.png"
          alt="Big Hero Robotics Academy"
          fill
          className="object-contain"
        />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">About Big Hero Robotics Academy</h1>
      <p className="text-slate-600 leading-relaxed text-base">
        Big Hero Robotics Academy empowers children and young inventors through hands-on
        STEM, robotics, and coding mentorship. We pair passionate engineering instructors with youth in
        small collaborative workshops and personalized 1-on-1 sessions.
      </p>
      <div className="pt-4 border-t border-slate-200">
        <Link
          href="/"
          className="text-sm font-semibold text-red-600 hover:text-red-700"
        >
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
