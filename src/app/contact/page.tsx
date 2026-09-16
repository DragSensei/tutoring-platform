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
        Have questions about sessions, enrollment, or student schedules? We are here to help!
      </p>

      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-left space-y-4 text-sm">
        <div>
          <span className="text-xs text-slate-400 block font-semibold">DIRECT PHONE / WHATSAPP</span>
          <span className="font-mono text-base font-bold text-slate-800">+20 100 000 0001</span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-semibold">EMAIL SUPPORT</span>
          <span className="font-mono text-base font-bold text-slate-800">support@bigherorobotics.com</span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-semibold">ACADEMY WORKSHOP</span>
          <span className="text-slate-700 font-medium">New Cairo, Cairo Governorate, Egypt</span>
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
