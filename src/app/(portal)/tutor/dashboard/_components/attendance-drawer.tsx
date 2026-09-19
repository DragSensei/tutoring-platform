'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Users, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { formatEGP } from '@/shared/utils/currency';
import type { GadwalSessionItem, SessionStudentAttendee } from '@/features/sessions/types';

interface AttendanceRecordingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: GadwalSessionItem | null;
  isEditMode?: boolean;
  onSubmitBatch: (sessionId: string, presentStudentIds: string[]) => void;
}

export function AttendanceRecordingDrawer({
  isOpen,
  onClose,
  session,
  isEditMode = false,
  onSubmitBatch,
}: AttendanceRecordingDrawerProps) {
  const [presenceMap, setPresenceMap] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Initialize or reset presence map whenever the active session changes
  React.useEffect(() => {
    if (!session) return;
    const initialMap: Record<string, boolean> = {};
    if (session.roster && session.roster.length > 0) {
      session.roster.forEach((student) => {
        // If editing past session or student was previously attended
        initialMap[student.id] = student.attended ?? false;
      });
    }
    setPresenceMap(initialMap);
  }, [session]);

  if (!isOpen || !session) return null;

  const roster: SessionStudentAttendee[] = session.roster || [];
  const maxCapacity = session.sessionType === 'GROUP' ? 4 : 1;
  const enrolledCount = roster.length;
  const remainingSeats = Math.max(0, maxCapacity - enrolledCount);

  const presentStudentIds = roster
    .filter((student) => Boolean(presenceMap[student.id]))
    .map((student) => student.id);

  const presentCount = presentStudentIds.length;
  const totalDeduction = presentCount * session.price;

  const toggleStudent = (studentId: string) => {
    setPresenceMap((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleBatchSubmit = async () => {
    setIsSubmitting(true);
    // Simulate interactive micro-delay for smooth tactile feedback
    await new Promise((resolve) => setTimeout(resolve, 350));
    onSubmitBatch(session.id, presentStudentIds);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-200"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-200 bg-stone-50/70 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-200/80 text-stone-800">
                    {session.sessionCode || 'SESSION'}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-600 bg-white border border-stone-200 px-2 py-0.5 rounded">
                    {session.sessionType} (Max {maxCapacity})
                  </span>
                </div>
                <h2 className="text-base font-bold text-stone-900 line-clamp-1">
                  {session.title}
                </h2>
                <p className="text-xs text-stone-500">
                  Fee: <strong className="font-mono font-semibold text-stone-800">{formatEGP(session.price)}</strong> per student
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Capacity Status Banner */}
            <div className="px-6 py-3.5 bg-stone-100/60 border-b border-stone-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-stone-500" />
                <span className="text-xs font-semibold text-stone-700">
                  Cohort Capacity: {enrolledCount}/{maxCapacity} Enrolled
                </span>
              </div>
              <span className="text-[11px] font-medium text-stone-500">
                {remainingSeats > 0
                  ? `${remainingSeats} ${remainingSeats === 1 ? 'seat' : 'seats'} open`
                  : 'Cohort full'}
              </span>
            </div>

            {/* Capacity Meter Bar (Max 4 blocks for group) */}
            <div className="px-6 py-2 bg-stone-50/50 border-b border-stone-100">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxCapacity }).map((_, idx) => {
                  const isSlotFilled = idx < enrolledCount;
                  const isSlotPresent = idx < roster.length && presenceMap[roster[idx]?.id];
                  return (
                    <div
                      key={idx}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        isSlotPresent
                          ? 'bg-brand-primary'
                          : isSlotFilled
                          ? 'bg-stone-300'
                          : 'bg-stone-200/50 border border-dashed border-stone-300'
                      }`}
                      title={
                        isSlotPresent
                          ? 'Present'
                          : isSlotFilled
                          ? 'Enrolled (Not marked)'
                          : 'Open Cohort Slot'
                      }
                    />
                  );
                })}
              </div>
            </div>

            {/* Student Attendance List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Student Cohort Roster
                </span>
                <span className="text-xs font-mono text-stone-500">
                  {presentCount} of {enrolledCount} marked
                </span>
              </div>

              {roster.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-sm">
                  No students assigned to this cohort.
                </div>
              ) : (
                roster.map((student) => {
                  const isPresent = Boolean(presenceMap[student.id]);
                  const deduction = isPresent ? session.price : 0;
                  const projectedBalance = student.walletBalance - deduction;
                  const willOverdraft = projectedBalance < 0;

                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isPresent
                          ? 'border-brand-border bg-brand-subtle/40 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox / Avatar */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                              isPresent
                                ? 'bg-brand-primary text-white'
                                : 'bg-stone-100 text-stone-400 border border-stone-300'
                            }`}
                          >
                            {isPresent ? (
                              <Check className="h-4 w-4 stroke-[3]" />
                            ) : (
                              <span className="text-[11px] font-bold">
                                {student.name.charAt(0)}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-900 truncate">
                              {student.name}
                            </p>
                            <p className="text-[11px] text-stone-400 truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>

                        {/* Presence Toggle Status */}
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                            isPresent
                              ? 'bg-brand-primary text-white shadow-xs'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {isPresent ? 'Present' : 'Absent'}
                        </span>
                      </div>

                      {/* Live Wallet Balance Impact */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100/80 flex items-center justify-between text-xs">
                        <span className="text-stone-500">
                          Wallet:{' '}
                          <strong className="font-mono text-stone-700">
                            {formatEGP(student.walletBalance)}
                          </strong>
                        </span>

                        <div className="text-right">
                          {isPresent ? (
                            <span className="font-mono font-medium text-brand-primary">
                              -{formatEGP(session.price)} &rarr; {formatEGP(projectedBalance)}
                            </span>
                          ) : (
                            <span className="text-stone-400 font-mono">0 EGP deducted</span>
                          )}
                        </div>
                      </div>

                      {/* Overdraft Warning Banner */}
                      {isPresent && willOverdraft && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                          <span>Student in overdraft. Session attendance will flag wallet.</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary & Actions */}
            <div className="p-5 border-t border-stone-200 bg-stone-50 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 font-medium">
                  Total Deductions ({presentCount} present):
                </span>
                <span className="font-mono text-sm font-bold text-stone-900">
                  {formatEGP(totalDeduction)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onClose}
                  className="w-1/3"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  onClick={handleBatchSubmit}
                  className="flex-1 gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {isEditMode ? 'Save Changes' : 'Submit Batch & Complete'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
