import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Big Hero Robotics Academy | STEM & Coding Platform',
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
        {/* Simple, Clean Public Navigation */}
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50 h-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
            {/* Brand Logo & Name */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Big Hero Robotics Academy Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                Big Hero Robotics
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/about" className="hover:text-red-600 transition-colors">
                About Us
              </Link>
              <Link href="/contact" className="hover:text-red-600 transition-colors">
                Contact Us
              </Link>
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm ml-2"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Viewport Container */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col justify-center">
          {children}
        </main>

        {/* Simple & Clean Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div>
              <span className="font-semibold text-slate-700">Big Hero Robotics Academy</span> &bull; &copy; {new Date().getFullYear()}
            </div>

            <div className="flex items-center gap-4 text-slate-500">
              <Link href="/about" className="hover:text-slate-800 transition-colors">
                About Us
              </Link>
              <span>&bull;</span>
              <Link href="/contact" className="hover:text-slate-800 transition-colors">
                Contact Us
              </Link>
              <span>&bull;</span>
              <span className="font-mono text-[11px] text-slate-400">support@bigherorobotics.com</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
