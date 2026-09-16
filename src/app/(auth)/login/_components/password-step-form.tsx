'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordStepForm() {
  const searchParams = useSearchParams();
  const rawNumber = searchParams.get('number') || searchParams.get('phone') || '';
  const [phoneNumber] = React.useState(rawNumber || 'No number provided');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8">
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
            Enter Password
          </h1>
          <p className="text-xs text-slate-500">
            Welcome back! Complete your authentication to continue
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Account Number
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {phoneNumber}
              </span>
            </div>
            <Link
              href="/login"
              className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Change
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 focus:outline-none p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg text-center font-medium"
              >
                Frontend demo: Password verified for {phoneNumber}.
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Login
            </button>
          </form>
        </div>

        <div className="text-center pt-1">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            &larr; Back to phone entry
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
