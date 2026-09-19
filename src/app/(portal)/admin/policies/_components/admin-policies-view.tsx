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

interface AdminPoliciesViewProps {
  initialPolicies: PlatformPoliciesData;
}

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
      groupSessionPrice: Number(policies.groupSessionPrice),
      privateSessionPrice: Number(policies.privateSessionPrice),
      allowOverdraft: Boolean(policies.allowOverdraft),
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
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
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
        </div>
      )}

      {/* Configurable Policies Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Policy 1: Attendance Check-in Deadline Window */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-subtle flex items-center justify-center text-brand-primary shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  1. Check-in Deadline Window Duration
                </h2>
                <p className="text-xs text-stone-500">
                  Defines the permissible duration post-start time before session attendance strictly locks (HTTP 403).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-mono font-bold text-brand-primary bg-brand-subtle px-2.5 py-1 rounded-md">
                deadline = start + {policies.checkInWindowHours}h
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
                <span className="text-xs text-stone-500">hours from session start</span>
              </div>
            </div>
            <p className="text-xs text-stone-500 self-center leading-relaxed">
              Sessions scheduled in Gadwal dynamically adopt this window. Once elapsed, all verification endpoints strictly reject check-in requests.
            </p>
          </div>
        </div>

        {/* Policy 2: Unidirectional Pricing Sentinel */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                2. Unidirectional Pricing Governance
              </h2>
              <p className="text-xs text-stone-500">
                Configures standard session debit deductions atomically debited from student wallets upon check-in.
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
                Standard STEM cohort rate debited per student check-in.
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
                Custom individual mentorship rate debited upon verification.
              </span>
            </div>
          </div>
        </div>

        {/* Policy 3: Overdraft Tolerance & Solvency Sentinel */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                3. Overdraft Tolerance Sentinel
              </h2>
              <p className="text-xs text-stone-500">
                Determines whether students with low balance can check in into negative balances.
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
                  When enabled, transactions that exceed account balance complete atomically and flag the student wallet (<code className="font-mono text-stone-700 bg-stone-100 px-1 py-0.5 rounded text-[11px]">is_flagged_overdraft = true</code>) for administrative top-up reconciliation. When disabled, check-ins are strictly blocked with an HTTP 402 Payment Required error.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-end gap-3">
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
            className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-red-700 transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving Policies...' : 'Save Platform Policies'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
