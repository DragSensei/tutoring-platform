import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tutoring Platform | منصة الحصص',
  description: 'Full-stack Next.js Tutoring Platform with Gadwal timetable, wallet ledgers, and 4-hour check-ins',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-bold text-xl text-indigo-600 flex items-center gap-2">
                <span className="text-2xl">🎓</span> Tutoring Platform
              </Link>
              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link href="/admin/gadwal" className="hover:text-indigo-600 transition-colors">
                  Admin Gadwal
                </Link>
                <Link href="/admin/wallets" className="hover:text-indigo-600 transition-colors">
                  Admin Wallets
                </Link>
                <Link href="/tutor/agenda" className="hover:text-indigo-600 transition-colors">
                  Tutor Agenda
                </Link>
                <Link href="/student/wallet" className="hover:text-indigo-600 transition-colors">
                  Student Wallet
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          Tutoring Platform &copy; {new Date().getFullYear()} — Feature-Driven Unidirectional Architecture
        </footer>
      </body>
    </html>
  );
}
