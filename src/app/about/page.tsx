import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
      <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-2xl mx-auto">
        ⚡
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">About Kinetic Robotics Academy</h1>
      <p className="text-slate-600 leading-relaxed text-base">
        Kinetic Robotics Academy is dedicated to empowering children and young inventors through hands-on
        STEM, electronics, and coding education. We pair passionate engineering mentors with youth in
        small group workshops and personalized 1-on-1 sessions.
      </p>
      <div className="pt-4 border-t border-slate-200">
        <Link
          href="/"
          className="text-sm font-semibold text-red-600 hover:text-red-700"
        >
          &larr; Back to Portal
        </Link>
      </div>
    </div>
  );
}
