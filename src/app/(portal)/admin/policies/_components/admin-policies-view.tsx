'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Clock, Wallet, Lock, ArrowRight } from 'lucide-react';

export function AdminPoliciesView() {
  return (
    <div className="space-y-8">
      {/* Header aligned with Admin baseline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Admin Console
            </span>
            <span className="text-xs font-semibold text-stone-500">Business Rules & Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">
            Platform Policies (سياسات المنصة)
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Core operating laws, attendance deadlines, and financial rules governing Big Hero Robotics Academy.
          </p>
        </div>

        <Link
          href="/admin"
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 shadow-xs transition-all active:scale-98 self-start sm:self-auto"
        >
          <span>Back to Overview</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Policies List */}
      <div className="space-y-4">
        {/* Policy 1: 4-Hour Deadline */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-subtle flex items-center justify-center text-brand-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                1. Strict 4-Hour Attendance Deadline Invariant
              </h2>
              <span className="text-xs font-semibold text-brand-primary font-mono">
                Rule: deadline = startTime + 4h
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Attendance check-ins for any session are strictly permitted during the active window. Once 4 hours have elapsed since the scheduled session start time, check-in requests are automatically rejected with an HTTP 403 Forbidden status code. No retroactive unverified student self-check-ins are allowed.
          </p>
        </div>

        {/* Policy 2: Pricing & Overdraft Sentinel */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                2. Unidirectional Pricing & Overdraft Sentinel
              </h2>
              <span className="text-xs font-semibold text-emerald-700 font-mono">
                Group: 375 EGP &bull; Private: 500 EGP
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Sessions are debited atomically upon attendance recording. If a student account balance drops below zero, the transaction completes successfully and the wallet is automatically flagged with an overdraft status (<code className="font-mono text-stone-700 bg-stone-100 px-1 py-0.5 rounded">is_flagged_overdraft = true</code>) for administrative top-up reconciliation.
          </p>
        </div>

        {/* Policy 3: Cryptographic Token Sentinel */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                3. Cryptographic Token Access Control
              </h2>
              <span className="text-xs font-semibold text-purple-700 font-mono">
                Protocol: Secure UUID v4 Token
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Attendance verification links are secured with unique cryptographic UUID tokens (<code className="font-mono text-stone-700 bg-stone-100 px-1 py-0.5 rounded">/attend/[token]</code>). Only authenticated tutors assigned to the cohort or administrators have authority to batch-verify or override presence.
          </p>
        </div>
      </div>
    </div>
  );
}
