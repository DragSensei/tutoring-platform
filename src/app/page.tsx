export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center items-center text-center max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 1. ACADEMY HEADER */}
      <div className="space-y-1.5 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Big Hero Robotics Academy
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Egypt’s certified STEM, robotics, and artificial intelligence academy for innovators aged 6 to 26.
        </p>
      </div>

      {/* 2. FAST FACTS & CREDENTIALS (ACADEMY INTEL) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center hover:border-slate-300 transition-colors">
          <div className="text-lg font-black text-red-600">2017</div>
          <div className="text-xs font-bold text-slate-800">Founded in Egypt</div>
          <div className="text-[11px] text-slate-500">Eng. Hossam Zayed</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center hover:border-slate-300 transition-colors">
          <div className="text-lg font-black text-slate-900">20+ Branches</div>
          <div className="text-xs font-bold text-slate-800">Nationwide & MENA</div>
          <div className="text-[11px] text-slate-500">Cairo, Alex, Delta & KSA</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center hover:border-slate-300 transition-colors">
          <div className="text-lg font-black text-red-600">Syndicate</div>
          <div className="text-xs font-bold text-slate-800">Accredited Training</div>
          <div className="text-[11px] text-slate-500">نقابة المهندسين المصرية</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center hover:border-slate-300 transition-colors">
          <div className="text-lg font-black text-slate-900">FLL & VEX</div>
          <div className="text-xs font-bold text-slate-800">Championship Track</div>
          <div className="text-[11px] text-slate-500">RoboCup & ARC Winners</div>
        </div>
      </div>

      {/* 3. THREE PILLARS (CORE VALUES) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-lg font-bold">
            🤖
          </div>
          <h2 className="text-sm font-bold text-slate-900">Hands-On Robotics & AI</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Practical hardware, sensors, microcontrollers, and coding. Students build real robots that solve autonomous challenges.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
            👨‍🏫
          </div>
          <h2 className="text-sm font-bold text-slate-900">Syndicate-Certified Mentors</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Passionate engineers accredited by the Egyptian Engineers Syndicate, empowering students with patient 1-on-1 guidance.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-left space-y-1.5 hover:border-slate-300 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
            🏆
          </div>
          <h2 className="text-sm font-bold text-slate-900">Competition Excellence</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Structured preparation for local and international tournaments including FIRST LEGO League, VEX Robotics, and RoboCup.
          </p>
        </div>
      </section>

      {/* 4. REASSURING BOTTOM BAR WITH HOTLINE */}
      <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Ages 6 to 26
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Small Collaborative Cohorts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600 font-bold">✓</span> Egyptian Engineers Syndicate Certified
        </span>
        <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
          📞 Hotline/WhatsApp: +20 122 229 8892
        </span>
      </div>
    </div>
  );
}
