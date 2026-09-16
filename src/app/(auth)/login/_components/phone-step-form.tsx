'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

export function PhoneStepForm() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      setError('Please enter your phone number or student ID');
      return;
    }
    router.push(`/login/password?number=${encodeURIComponent(trimmed)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm mx-auto space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="relative w-14 h-14 mx-auto drop-shadow-sm">
          <Image
            src="/logo.png"
            alt="Big Hero Robotics Academy"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign In to Academy
        </h1>
        <p className="text-xs text-slate-500">
          Enter your registered phone number or student ID to continue
        </p>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleNext} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-1.5 text-left">
            <label htmlFor="phoneNumber" className="block text-xs font-bold text-slate-700">
              Phone Number / Student ID
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 010 1234 5678"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Login &rarr;
          </button>
        </form>
      </div>

      <div className="text-center pt-1">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          &larr; Back to Home
        </Link>
      </div>
    </motion.div>
  );
}
