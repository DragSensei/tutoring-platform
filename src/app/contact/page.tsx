import Link from 'next/link';
import Image from 'next/image';

export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto py-8 text-center space-y-6">
      <div className="relative w-16 h-16 mx-auto">
        <Image
          src="/logo.png"
          alt="Big Hero Robotics Academy"
          fill
          className="object-contain"
        />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900">Contact Big Hero Robotics</h1>
      <p className="text-slate-600 text-sm">
        Have questions about robotics programs, competition teams, or session schedules? We are here to help!
      </p>

      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-left space-y-4 text-sm">
        <div>
          <span className="text-xs text-slate-400 block font-semibold">DIRECT HOTLINE / WHATSAPP</span>
          <a
            href="https://wa.me/201222298892"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-base font-bold text-red-600 hover:underline"
          >
            +20 122 229 8892
          </a>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-semibold">OFFICIAL EMAIL</span>
          <a
            href="mailto:info@bigherorobotics.com"
            className="font-mono text-base font-bold text-slate-800 hover:text-red-600"
          >
            info@bigherorobotics.com
          </a>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-semibold">ACADEMY BRANCHES (20+ LOCATIONS)</span>
          <span className="text-slate-700 font-medium">
            Dokki (Giza), Nasr City, Heliopolis, Maadi, Alexandria, Delta, and Upper Egypt &bull; Regional in KSA & Tunisia
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-semibold">OFFICIAL ACCREDITATION</span>
          <span className="text-slate-700 font-medium">
            Certified by the Egyptian Engineers Syndicate (نقابة المهندسين المصرية)
          </span>
        </div>
      </div>

      <div className="pt-2">
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
