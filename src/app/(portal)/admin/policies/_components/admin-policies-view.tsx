'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Clock,
  Wallet,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  PlatformPoliciesData,
  updatePlatformPolicies,
} from '@/features/policies/server/policy-actions';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPoliciesViewProps {
  initialPolicies: PlatformPoliciesData;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AdminPoliciesView({ initialPolicies }: AdminPoliciesViewProps) {
  const [policies, setPolicies] = React.useState<PlatformPoliciesData>(initialPolicies);
  const [isSaving, setIsSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const res = await updatePlatformPolicies({
      checkInWindowHours: Number(policies.checkInWindowHours),
      groupSessionPrice: policies.groupSessionPrice.toFixed(2),
      privateSessionPrice: policies.privateSessionPrice.toFixed(2),
      allowOverdraft: Boolean(policies.allowOverdraft),
      defaultTutorHourlyRate: policies.defaultTutorHourlyRate,
      commissionEnabled: policies.commissionEnabled,
      commissionRateBps: policies.commissionRateBps,
      commissionBasis: 'FINALIZED_SESSION_WALLET_CHARGE',
    });

    setIsSaving(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: 'Platform policies successfully updated! Live system rules synchronized across cohorts and wallets.',
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.message || 'Failed to update platform policies. Please verify values.',
      });
    }
  };

  const handleReset = () => {
    setPolicies(initialPolicies);
    setStatusMessage(null);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header aligned with Admin baseline */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5 min-h-[92px]"
      >
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
          <p className="text-xs sm:text-sm text-stone-500 mt-1 line-clamp-1">
            Configure live operating laws, session pricing, attendance deadlines, and wallet overdraft sentinels.
          </p>
        </div>

        <Link
          href="/admin"
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 shadow-xs transition-all active:scale-98 self-start sm:self-auto"
        >
          <span>Back to Overview</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>

      {/* Notification Toast */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium leading-relaxed">{statusMessage.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configurable Policies Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Policy 1: Attendance Check-in Deadline Window */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-subtle flex items-center justify-center text-brand-primary shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  1. Attendance Grace Period
                </h2>
                <p className="text-xs text-stone-500">
                  Defines the grace period after the concrete session end before Tutor attendance strictly locks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-mono font-bold text-brand-primary bg-brand-subtle px-2.5 py-1 rounded-md">
                attendance closes = end + {policies.checkInWindowHours}h grace
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label
                htmlFor="checkInWindowHours"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Window Duration (Hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="checkInWindowHours"
                  type="number"
                  min="1"
                  max="48"
                  required
                  value={policies.checkInWindowHours}
                  onChange={(e) =>
                    setPolicies({
                      ...policies,
                      checkInWindowHours: Number(e.target.value),
                    })
                  }
                  className="min-h-[44px] w-32 px-3 py-2 text-sm font-semibold border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors bg-stone-50/50"
                />
                <span className="text-xs text-stone-500">hours after session end</span>
              </div>
            </div>
            <p className="text-xs text-stone-500 self-center leading-relaxed">
              Sessions scheduled in Gadwal dynamically adopt this grace period. Tutor attendance opens at the concrete start and closes after the concrete end plus this value.
            </p>
          </div>
        </motion.div>

        {/* Policy 2: Unidirectional Pricing Sentinel */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                2. Unidirectional Pricing Governance
              </h2>
              <p className="text-xs text-stone-500">
                Configures the standard session settlement reconciled from the final Tutor attendance at the grace close.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-stone-200/60 p-4 bg-stone-50/50 space-y-2">
              <label
                htmlFor="groupSessionPrice"
                className="block text-xs font-semibold text-stone-700"
              >
                Group Session Rate (EGP)
              </label>
              <input
                id="groupSessionPrice"
                type="number"
                min="0"
                step="5"
                required
                value={policies.groupSessionPrice}
                onChange={(e) =>
                  setPolicies({
                    ...policies,
                    groupSessionPrice: Number(e.target.value),
                  })
                }
                className="min-h-[44px] w-full px-3 py-2 text-sm font-semibold border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white transition-colors"
              />
              <span className="text-[11px] text-stone-500 block">
                Standard STEM cohort rate charged once for each final PRESENT decision.
              </span>
            </div>

            <div className="rounded-xl border border-stone-200/60 p-4 bg-stone-50/50 space-y-2">
              <label
                htmlFor="privateSessionPrice"
                className="block text-xs font-semibold text-stone-700"
              >
                Private 1-on-1 Rate (EGP)
              </label>
              <input
                id="privateSessionPrice"
                type="number"
                min="0"
                step="5"
                required
                value={policies.privateSessionPrice}
                onChange={(e) =>
                  setPolicies({
                    ...policies,
                    privateSessionPrice: Number(e.target.value),
                  })
                }
                className="min-h-[44px] w-full px-3 py-2 text-sm font-semibold border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white transition-colors"
              />
              <span className="text-[11px] text-stone-500 block">
                Custom individual mentorship rate charged once for a final PRESENT decision.
              </span>
            </div>
          </div>
        </motion.div>

        {/* Policy 3: Overdraft Tolerance & Solvency Sentinel */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-subtle flex items-center justify-center text-brand-primary shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">3. Tutor pay and referral commission</h2>
              <p className="text-xs text-stone-500">Rates are snapshotted only after the Session is finalized. Policy edits never rewrite existing ledger entries.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-stone-200/60 bg-stone-50/50 p-4">
              <label htmlFor="defaultTutorHourlyRate" className="block text-xs font-semibold text-stone-700">Default tutor hourly rate (EGP)</label>
              <input id="defaultTutorHourlyRate" type="number" min="0" step="0.01" required value={policies.defaultTutorHourlyRate} onChange={(event) => setPolicies({ ...policies, defaultTutorHourlyRate: event.target.value })} className="min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold" />
              <p className="text-[11px] text-stone-500">A zero or unset rate creates no pay entry; finalized delivery appears in rate review.</p>
            </div>
            <div className="space-y-2 rounded-xl border border-stone-200/60 bg-stone-50/50 p-4">
              <label htmlFor="commissionRate" className="block text-xs font-semibold text-stone-700">Referral commission rate (%)</label>
              <input id="commissionRate" type="number" min="0" max="100" step="0.01" required value={(policies.commissionRateBps / 100).toFixed(2)} onChange={(event) => setPolicies({ ...policies, commissionRateBps: Math.round(Number(event.target.value) * 100) })} className="min-h-[44px] w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold" />
              <p className="text-[11px] text-stone-500">Basis points: {policies.commissionRateBps} · rule version: {policies.commissionRuleVersion}</p>
            </div>
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-stone-200/60 bg-stone-50/50 p-4">
            <input type="checkbox" checked={policies.commissionEnabled} onChange={(event) => setPolicies({ ...policies, commissionEnabled: event.target.checked })} className="mt-0.5 h-5 w-5 rounded border-stone-300 text-brand-primary" />
            <span><span className="block text-sm font-bold text-stone-900">Enable referral commission</span><span className="mt-1 block text-xs leading-relaxed text-stone-500">Accrues for eligible Referral or Sales sources only, from finalized system-tracked wallet charges. Direct and None are excluded. This does not prove external cash collection.</span></span>
          </label>
          <p className="text-xs text-stone-500">Basis: <strong>FINALIZED_SESSION_WALLET_CHARGE</strong> · last changed by {policies.commissionUpdatedBy ?? 'not recorded'}{policies.commissionUpdatedAt ? ` on ${new Date(policies.commissionUpdatedAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo' })}` : ''}.</p>
        </motion.div>

        {/* Policy 4: Overdraft Tolerance & Solvency Sentinel */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                4. Overdraft Tolerance Sentinel
              </h2>
              <p className="text-xs text-stone-500">
                Determines whether final PRESENT settlement may place a Student wallet below zero.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-stone-200/60 p-4 bg-stone-50/50 hover:bg-stone-50 transition-colors">
              <input
                type="checkbox"
                checked={policies.allowOverdraft}
                onChange={(e) =>
                  setPolicies({
                    ...policies,
                    allowOverdraft: e.target.checked,
                  })
                }
                className="h-5 w-5 rounded border-stone-300 text-brand-primary focus:ring-brand-primary/20 mt-0.5"
              />
              <div>
                <span className="text-sm font-bold text-stone-900 block">
                  Permit Negative Balances (Automatic Overdraft Flagging)
                </span>
                <span className="text-xs text-stone-500 leading-relaxed block mt-1">
                  When enabled, final PRESENT settlement may complete atomically and flag the student wallet (<code className="font-mono text-stone-700 bg-stone-100 px-1 py-0.5 rounded text-[11px]">is_flagged_overdraft = true</code>) for administrative top-up reconciliation. When disabled, settlement is blocked with an HTTP 402 Payment Required error.
                </span>
              </div>
            </label>
          </div>
        </motion.div>

        {/* Action Controls */}
        <motion.div variants={itemVariants} className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold border border-stone-300 text-stone-700 hover:bg-stone-100/70 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-hover transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving Policies...' : 'Save Platform Policies'}</span>
          </button>
        </motion.div>
      </form>
    </motion.div>
  );
}
