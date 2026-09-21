'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema } from '@/features/auth/schemas';
import { getRoleRedirectPath } from '@/features/auth/role-redirect';

export function PasswordStepForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNumber = searchParams.get('number') || searchParams.get('phone') || '';
  const [identifier] = React.useState(rawNumber);
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Invalid credentials');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const data = await response.json();

      if (!response.ok || !data.user?.role) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      router.replace(getRoleRedirectPath(data.user.role));
      router.refresh();
    } catch {
      setError('Unable to sign in right now. Please try again.');
      setLoading(false);
    }
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
                {identifier || 'No account identifier provided'}
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
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
                  className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-700 focus:outline-none"
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

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>

        <div className="text-center pt-1">
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center justify-center px-3 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            &larr; Back to phone entry
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
