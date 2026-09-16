import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kinetic Robotics Academy | STEM & Coding for Young Inventors',
  description: 'Hands-on robotics, coding, and STEM tutoring for kids and teens. Simple schedules, flexible family wallets, and inspiring mentors.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-rose-500 selection:text-white">
        {/* Friendly, Clean Light Navigation Header */}
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
                  🤖
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
                    Kinetic Robotics
                    <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      Academy
                    </span>
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    STEM & Coding for Young Inventors
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
                <Link
                  href="/admin/gadwal"
                  className="hover:text-red-600 transition-colors flex items-center gap-1.5"
                >
                  📅 Class Schedule
                </Link>
                <Link
                  href="/student/wallet"
                  className="hover:text-red-600 transition-colors flex items-center gap-1.5"
                >
                  💳 Student Wallet
                </Link>
                <Link
                  href="/tutor/agenda"
                  className="hover:text-red-600 transition-colors flex items-center gap-1.5"
                >
                  👨‍🏫 Tutor Agenda
                </Link>
                <Link
                  href="/admin/wallets"
                  className="hover:text-red-600 transition-colors flex items-center gap-1.5"
                >
                  ⚙️ Admin Center
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/admin/gadwal"
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                View Sessions
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Clean, Reassuring Family Footer */}
        <footer className="border-t border-slate-200 bg-white py-10 text-slate-600 text-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
                <span>🤖 Kinetic Robotics Academy</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  Active Enrollment
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Inspiring confidence, critical thinking, and technical mastery in every student.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
              <Link href="/admin/gadwal" className="hover:text-red-600 transition-colors">
                Gadwal Timetable
              </Link>
              <Link href="/student/wallet" className="hover:text-red-600 transition-colors">
                Parent & Student Wallet
              </Link>
              <Link href="/tutor/agenda" className="hover:text-red-600 transition-colors">
                Tutor Portal
              </Link>
              <Link href="/login" className="hover:text-red-600 transition-colors">
                Account Login
              </Link>
            </div>

            <div className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Kinetic Robotics. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
