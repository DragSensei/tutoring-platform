import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kinetic Robotics Academy | STEM & Coding Platform',
  description: 'Hands-on robotics, coding, and STEM tutoring for kids and teens with automated Gadwal timetables and student wallets.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white">
        {/* Clean, Streamlined Navigation Bar */}
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50 h-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            {/* Brand Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-base shadow-sm group-hover:bg-red-700 transition-colors">
                  ⚡
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">
                    Kinetic Robotics
                  </span>
                  <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                    Academy
                  </span>
                </div>
              </Link>

              {/* Primary User Navigation */}
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                <Link
                  href="/admin/gadwal"
                  className="hover:text-red-600 transition-colors"
                >
                  Schedule
                </Link>
                <Link
                  href="/student/wallet"
                  className="hover:text-red-600 transition-colors"
                >
                  Student Wallet
                </Link>
                <Link
                  href="/tutor/agenda"
                  className="hover:text-red-600 transition-colors"
                >
                  Tutor Portal
                </Link>
              </nav>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/admin/wallets"
                className="hidden sm:inline-block text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Admin
              </Link>
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                Sign In
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col justify-center">
          {children}
        </main>

        {/* Slim, Screen-Fitting Single-Line Footer */}
        <footer className="border-t border-slate-200 bg-white py-3 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div>
              <span className="font-semibold text-slate-700">Kinetic Robotics Academy</span> &bull; STEM & Coding Platform
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                4h Verified Attendance
              </span>
              <span>&bull;</span>
              <Link href="/admin/gadwal" className="hover:text-slate-700 transition-colors">
                Gadwal
              </Link>
              <span>&bull;</span>
              <Link href="/student/wallet" className="hover:text-slate-700 transition-colors">
                Wallet
              </Link>
              <span>&bull;</span>
              <Link href="/admin/wallets" className="hover:text-slate-700 transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
