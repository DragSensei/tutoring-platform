'use client';

import * as React from 'react';
import Link from 'next/link';
import { Ban, Edit3, Loader2, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';
import { TablePagination } from '@/shared/components/table-pagination';
import { useTablePagination } from '@/shared/hooks/use-table-pagination';
import { TableToolbar } from '@/shared/components/table-toolbar';
import { matchesTableSearch } from '@/shared/utils/table-search';
import { SessionType, SessionStatus } from '@/shared/types';

export interface SessionStudentAttendee {
  id: string;
  name: string;
  email: string;
  attended: boolean;
}

export interface GadwalSessionItem {
  id: string;
  title: string;
  tutorId: string;
  tutorName: string;
  sessionType: SessionType;
  startTime: string;
  endTime: string;
  deadline: string;
  token: string | null;
  attendanceClosesAt?: string;
  attendanceSavedAt?: string | null;
  attendanceFinalizedAt?: string | null;
  attendanceWindowState?: 'BEFORE' | 'OPEN' | 'CLOSED';
  baseStartTime?: string;
  isRescheduled?: boolean;
  rescheduleReason?: string | null;
  status: SessionStatus;
  historicalOnly?: boolean;
  attendeeCount: number;
  participantCount?: number;
  transactionCount?: number;
  attendanceNotes?: string | null;
  price: number;
  assignedStudents?: string[];
  sessionCode?: string;
  roster?: SessionStudentAttendee[];
}

interface GadwalTableProps {
  sessions: GadwalSessionItem[];
  showTutorColumn?: boolean;
  showAdminActions?: boolean;
  onDeleteSession?: (sessionId: string) => Promise<unknown>;
  onCancelSession?: (sessionId: string) => Promise<unknown>;
}

const SESSION_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'scheduled' },
  { value: 'ACTIVE', label: 'active' },
  { value: 'COMPLETED', label: 'completed' },
  { value: 'CANCELLED', label: 'cancelled' },
];

const SESSION_TYPE_OPTIONS = [
  { value: 'GROUP', label: 'group' },
  { value: 'PRIVATE', label: 'private' },
];

export function GadwalTable({ sessions, showTutorColumn = true, showAdminActions = false, onDeleteSession, onCancelSession }: GadwalTableProps) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<{ session: GadwalSessionItem; mode: 'delete' | 'cancel' } | null>(null);
  const filteredSessions = sessions.filter((session) =>
    matchesTableSearch([session.title, session.tutorName, session.sessionType, session.status], search) &&
    (!statusFilter || session.status === statusFilter) &&
    (!typeFilter || session.sessionType === typeFilter)
  );
  const pagination = useTablePagination(filteredSessions);
  async function handleMutation() {
    if (!confirmation) return;
    const { session, mode } = confirmation;
    setPendingAction(`${mode}:${session.id}`);
    setActionError(null);
    try {
      if (mode === 'delete') await onDeleteSession?.(session.id);
      else await onCancelSession?.(session.id);
      setConfirmation(null);
      window.location.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update this session');
    } finally {
      setPendingAction(null);
    }
  }
  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="default">Scheduled</Badge>;
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  return (
    <>
    <Card className="w-full min-w-0 max-w-full rounded-2xl border-stone-200/80 bg-white shadow-xs overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl">Gadwal Timetable (جدول الحصص)</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 max-w-full">
        {sessions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No sessions scheduled.</div>
        ) : (
          <>
            <TableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              resultCount={filteredSessions.length}
              onClear={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
              searchPlaceholder="Search sessions, tutors, or status"
              filters={[
                { id: 'status', label: 'status', value: statusFilter, onChange: setStatusFilter, options: SESSION_STATUS_OPTIONS },
                { id: 'type', label: 'type', value: typeFilter, onChange: setTypeFilter, options: SESSION_TYPE_OPTIONS },
              ]}
            />
            {filteredSessions.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-stone-500">No sessions match these filters. Clear filters to see the full timetable.</div>
            ) : (
            <>
              <div className="overflow-x-auto min-w-0 max-w-full">
              <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Session Title</th>
                  {showTutorColumn && <th className="px-4 py-3">Tutor</th>}
                  <th className="px-4 py-3">Type / Rate</th>
                  <th className="px-4 py-3">Start Time</th>
                  <th className="px-4 py-3">Attendance closes</th>
                  <th className="px-4 py-3">Attendees</th>
                  <th className="px-4 py-3">Status</th>
                  {showAdminActions && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pagination.items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.title}</td>
                    {showTutorColumn && <td className="px-4 py-3">{s.tutorName}</td>}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{s.sessionType}</span>
                      <span className="block text-xs text-slate-500">{formatEGP(s.price)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(s.startTime)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {formatDateTime(s.deadline)}
                    </td>
                    <td className="px-4 py-3 font-medium">{s.attendeeCount}</td>
                    <td className="px-4 py-3">{getStatusBadge(s.status)}</td>
                    {showAdminActions && <td className="px-4 py-3 text-right">
                      <div className="flex min-w-[180px] items-center justify-end gap-2">
                        {s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && <Link href={`/admin/gadwal/${s.id}/edit`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50" title="Edit session">
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                        </Link>}
                        {s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && (() => {
                          const canDelete = s.status === 'SCHEDULED' && new Date(s.startTime).getTime() > Date.now() && s.attendeeCount === 0 && (s.transactionCount || 0) === 0;
                          const mode = canDelete ? 'delete' : 'cancel';
                          const isPending = pendingAction === `${mode}:${s.id}`;
                          return <button type="button" disabled={Boolean(pendingAction)} onClick={() => setConfirmation({ session: s, mode })} className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${canDelete ? 'text-rose-700 hover:bg-rose-50' : 'text-amber-700 hover:bg-amber-50'}`} title={canDelete ? 'Delete unstarted session' : 'Cancel and preserve history'}>
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : canDelete ? <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Ban className="h-3.5 w-3.5" aria-hidden="true" />}
                            {canDelete ? 'Delete' : 'Cancel'}
                          </button>;
                        })()}
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
              </table>
              </div>
              {actionError && !confirmation && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800">{actionError}</p>}
              <TablePagination
                itemCount={filteredSessions.length}
                page={pagination.page}
                pageCount={pagination.pageCount}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
              />
            </>
            )}
          </>
        )}
    </CardContent>
    </Card>
    <ConfirmDialog
      open={Boolean(confirmation)}
      title={confirmation?.mode === 'delete' ? 'Delete scheduled session?' : 'Cancel scheduled session?'}
      description={confirmation?.mode === 'delete'
        ? `Delete ${confirmation.session.title}? This will remove the unstarted session.`
        : confirmation ? `Cancel ${confirmation.session.title}? Its history will be preserved.` : ''}
      confirmLabel={confirmation?.mode === 'delete' ? 'Delete session' : 'Cancel session'}
      cancelLabel="Keep session"
      pending={Boolean(pendingAction)}
      error={actionError}
      onCancel={() => { setConfirmation(null); setActionError(null); }}
      onConfirm={() => void handleMutation()}
    />
    </>
  );
}
