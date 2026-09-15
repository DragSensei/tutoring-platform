'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';
import { formatEGP } from '@/shared/utils/currency';
import { CopyTokenButton } from './copy-token-button';
import { SessionType, SessionStatus } from '@/shared/types';

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
  price: number;
}

interface GadwalTableProps {
  sessions: GadwalSessionItem[];
  showTutorColumn?: boolean;
}

export function GadwalTable({ sessions, showTutorColumn = true }: GadwalTableProps) {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Gadwal Timetable (جدول الحصص)</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No sessions scheduled.</div>
        ) : (
          <div className="overflow-x-auto">
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
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.title}</td>
                    {showTutorColumn && <td className="px-4 py-3">{s.tutorName}</td>}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{s.sessionType}</span>
                      <span className="block text-xs text-slate-500">{formatEGP(s.price)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(s.startTime).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(s.deadline).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
        )}
      </CardContent>
    </Card>
  );
}
