import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kinetic Heroic Robotics | Tutoring & STEM Platform',
  description: 'Flight-grade robotics, engineering, and tutoring platform with automated Gadwal timetables, 4-hour check-in verification, and student wallet ledgers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col bg-[#131315] text-[#e5e1e4] selection:bg-red-600 selection:text-white">
        {/* Flight-Grade Terminal Header */}
        <header className="border-b border-[#22242b] bg-[#131315]/95 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded bg-[#dc2626] flex items-center justify-center text-white font-mono font-bold text-lg shadow-[0_0_16px_rgba(220,38,38,0.4)] group-hover:scale-105 transition-transform">
                  ⚡
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                    KINETIC ROBOTICS
                    <span className="font-mono text-[10px] text-red-400 font-normal px-1 py-0.2 bg-red-950/60 border border-red-800/40 rounded">
                      [ACADEMY]
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 tracking-wider">
                    FLIGHT-GRADE STEM & CODE
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-1 text-xs font-mono font-medium text-slate-400">
                <Link
                  href="/admin/gadwal"
                  className="px-3 py-1.5 rounded hover:text-white hover:bg-[#1c1b1d] transition-colors flex items-center gap-1"
                >
                  <span className="text-red-500 font-bold">[01]</span> GADWAL
                </Link>
                <Link
                  href="/admin/wallets"
                  className="px-3 py-1.5 rounded hover:text-white hover:bg-[#1c1b1d] transition-colors flex items-center gap-1"
                >
                  <span className="text-red-500 font-bold">[02]</span> WALLETS
                </Link>
                <Link
                  href="/tutor/agenda"
                  className="px-3 py-1.5 rounded hover:text-white hover:bg-[#1c1b1d] transition-colors flex items-center gap-1"
                >
                  <span className="text-red-500 font-bold">[03]</span> TUTOR AGENDA
                </Link>
                <Link
                  href="/student/wallet"
                  className="px-3 py-1.5 rounded hover:text-white hover:bg-[#1c1b1d] transition-colors flex items-center gap-1"
                >
                  <span className="text-red-500 font-bold">[04]</span> STUDENT WALLET
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Telemetry LED Status Chip */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#1c1b1d] border border-slate-800 text-[11px] font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 led-emerald" />
                <span>PWR: 99.4%</span>
                <span className="text-slate-600">|</span>
                <span className="text-red-400">NODE: ONLINE</span>
              </div>

              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded text-xs font-mono font-semibold bg-[#1c1b1d] hover:bg-[#2a2a2c] text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors"
              >
                AUTH TERMINAL
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-[#22242b] bg-[#0e0e10] py-8 text-xs font-mono text-slate-500">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 led-crimson" />
              <span>KINETIC HEROIC ROBOTICS &bull; AUTONOMOUS STEM AGENT</span>
            </div>
            <div className="text-slate-600">
              [SYS.REV_2026.09] &bull; 4-HOUR ATOMIC ATTENDANCE &bull; EGP WALLET LEDGER
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
