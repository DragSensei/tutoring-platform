'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/shared/components/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';
import { formatEGP } from '@/shared/utils/currency';
import { getRemainingCheckInTime, RemainingTime } from '@/shared/utils/deadline';
import { SessionType } from '@/shared/types';
import { formatTime } from '@/shared/utils/date-format';

interface CheckInWidgetProps {
  token: string;
  session: {
    title: string;
    sessionType: SessionType;
    startTime: string;
    deadline: string;
    price: number;
    tutorName: string;
  };
  studentId?: string;
  initialCheckedIn?: boolean;
}

export function CheckInWidget({ token, session, studentId, initialCheckedIn = false }: CheckInWidgetProps) {
  const [remaining, setRemaining] = React.useState<RemainingTime>(() =>
    getRemainingCheckInTime(session.deadline)
  );
  const [isCheckedIn, setIsCheckedIn] = React.useState(initialCheckedIn);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resultData, setResultData] = React.useState<{
    deductedAmount?: number;
    newBalance?: number;
    isOverdraft?: boolean;
  } | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getRemainingCheckInTime(session.deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [session.deadline]);

  const handleCheckIn = async () => {
    if (remaining.isExpired) {
      setError('Check-in window expired: 4-hour deadline has passed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/attend/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Check-in failed');
        setLoading(false);
        return;
      }

      setIsCheckedIn(true);
      setResultData({
        deductedAmount: data.deductedAmount,
        newBalance: data.newBalance,
        isOverdraft: data.isOverdraft,
      });
      setLoading(false);
    } catch {
      setError('A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-slate-200 overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-red-500 to-red-600" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant={session.sessionType === 'PRIVATE' ? 'default' : 'secondary'}>
            {session.sessionType} SESSION
          </Badge>
          <span className="text-sm font-semibold text-red-600 font-mono">
            {formatEGP(session.price)}
          </span>
        </div>
        <CardTitle className="text-2xl mt-2">{session.title}</CardTitle>
        <CardDescription>Instructor: {session.tutorName}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-sm">
          <div>
            <span className="text-slate-500 block text-xs">Start Time</span>
            <span className="font-medium text-slate-800 font-mono">
              {formatTime(session.startTime)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">4h Check-in Deadline</span>
            <span className="font-medium text-slate-800 font-mono">
              {formatTime(session.deadline)}
            </span>
          </div>
        </div>

        {/* Real-time Countdown Banner */}
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-sm ${
            remaining.isExpired
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <span className="font-medium">
            {remaining.isExpired ? 'Check-in Expired' : 'Time Remaining to Check In:'}
          </span>
          <span className="font-mono font-bold">{remaining.formatted}</span>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {isCheckedIn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg space-y-2"
          >
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-emerald-600">✓</span> Attendance Verified!
            </div>
            {resultData && (
              <div className="text-xs space-y-1 text-emerald-800">
                <p>Deducted: {formatEGP(resultData.deductedAmount || 0)}</p>
                <p>New Balance: {formatEGP(resultData.newBalance || 0)}</p>
                {resultData.isOverdraft && (
                  <p className="text-amber-700 font-medium">
                    ⚠️ Account in overdraft. Flagged for administrative review.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </CardContent>

      <CardFooter>
        {!isCheckedIn ? (
          <Button
            className="w-full"
            variant="primary"
            size="lg"
            isLoading={loading}
            disabled={remaining.isExpired}
            onClick={handleCheckIn}
          >
            {remaining.isExpired ? '4-Hour Window Expired' : 'Confirm Attendance & Deduct'}
          </Button>
        ) : (
          <Button className="w-full" variant="secondary" size="lg" disabled>
            Already Checked In
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
