import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col justify-center items-center text-center max-w-4xl mx-auto px-4 py-4 space-y-10">
      {/* 1. HERO HEADER */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-700 shadow-sm">
          <span>🚀</span>
          <span>Welcome to Kinetic Robotics Academy</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Where Young Creators <br className="hidden sm:inline" />
          <span className="text-red-600">Build Tomorrow’s Technology.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Inspiring coding, robotics, and engineering mentorship for children and teens.
          We turn curious minds into confident inventors through hands-on projects and supportive guidance.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign In to Academy Portal &rarr;
          </Link>
          <Link
            href="/about"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-300 shadow-sm transition-all"
          >
            About Our Programs
          </Link>
        </div>
      </section>

      {/* 2. THREE PILLARS (WHY PARENTS CHOOSE US) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl pt-2">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-2 hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">
            🤖
          </div>
          <h2 className="text-base font-bold text-slate-900">Hands-On Building</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Children build real physical robots, write code, and see their creations move and solve challenges.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-2 hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
            👨‍🏫
          </div>
          <h2 className="text-base font-bold text-slate-900">Expert Mentors</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Passionate engineers who guide and empower each student step-by-step with patience and encouragement.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-2 hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            💡
          </div>
          <h2 className="text-base font-bold text-slate-900">Creative Confidence</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Transform screen time into productive STEM mastery, problem-solving skills, and teamwork.
          </p>
        </div>
      </section>

      {/* 3. REASSURING BOTTOM BAR FOR FAMILIES */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 pt-2">
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Ages 8 to 17
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Small Collaborative Groups
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Personalized 1-on-1 Mentorship
        </span>
      </div>
    </div>
  );
}
