'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';
import { TablePagination } from '@/shared/components/table-pagination';
import { useTablePagination } from '@/shared/hooks/use-table-pagination';
import { TableToolbar } from '@/shared/components/table-toolbar';
import { matchesTableSearch } from '@/shared/utils/table-search';
import { CopyTokenButton } from './copy-token-button';
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
  token: string;
  status: SessionStatus;
  attendeeCount: number;
  attendanceNotes?: string | null;
  price: number;
  assignedStudents?: string[];
  sessionCode?: string;
  roster?: SessionStudentAttendee[];
}

interface GadwalTableProps {
  sessions: GadwalSessionItem[];
  showTutorColumn?: boolean;
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

export function GadwalTable({ sessions, showTutorColumn = true }: GadwalTableProps) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const filteredSessions = sessions.filter((session) =>
    matchesTableSearch([session.title, session.tutorName, session.sessionType, session.status, session.token], search) &&
    (!statusFilter || session.status === statusFilter) &&
    (!typeFilter || session.sessionType === typeFilter)
  );
  const pagination = useTablePagination(filteredSessions);
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
              searchPlaceholder="Search sessions, tutors, status, or token"
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
                  <th className="px-4 py-3">4h Deadline</th>
                  <th className="px-4 py-3">Attendees</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Attendance Token</th>
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
                    <td className="px-4 py-3 text-right">
                      <CopyTokenButton token={s.token} />
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
              </div>
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
  );
}
