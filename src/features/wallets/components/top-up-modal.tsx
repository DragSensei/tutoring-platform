'use client';

import * as React from 'react';
import { Dialog } from '@/shared/components/dialog';
import { Button } from '@/shared/components/button';
import { formatEGP } from '@/shared/utils/currency';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    currentBalance: number;
  } | null;
  onSuccess?: () => void;
}

export function TopUpModal({ isOpen, onClose, student, onSuccess }: TopUpModalProps) {
  const [amount, setAmount] = React.useState<string>('500');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!student) return null;

  const quickPicks = [250, 375, 500, 1000, 1500];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive deposit amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/wallets/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          amount: numAmount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to deposit funds');
        setLoading(false);
        return;
      }

      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch {
      setError('Network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Deposit Funds: ${student.name}`}
      description={`Current Balance: ${formatEGP(student.currentBalance)}`}
    >
      <form onSubmit={handleDeposit} className="space-y-4 mt-2">
        {error && (
          <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Deposit Amount (EGP)
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="500.00"
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-500 mb-2">
            Quick Amount Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPicks.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                +{val} EGP
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Confirm Deposit
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
