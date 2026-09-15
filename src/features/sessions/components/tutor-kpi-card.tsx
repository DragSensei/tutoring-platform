'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { TutorVolumeKPIs } from '@/shared/types';

interface TutorKPICardProps {
  kpis: TutorVolumeKPIs;
}

export function TutorKPICard({ kpis }: TutorKPICardProps) {
  const stats = [
    {
      label: 'This Month Sessions',
      value: kpis.monthlySessionCount,
      sublabel: 'Scheduled / Completed',
      color: 'text-indigo-600',
    },
    {
      label: 'Lifetime Sessions',
      value: kpis.lifetimeSessionCount,
      sublabel: 'Total Sessions Conducted',
      color: 'text-purple-600',
    },
    {
      label: 'Monthly Student Volume',
      value: kpis.monthlyAttendedStudents,
      sublabel: 'Verified Attendances',
      color: 'text-emerald-600',
    },
    {
      label: 'Lifetime Student Volume',
      value: kpis.lifetimeAttendedStudents,
      sublabel: 'Total Students Tutored',
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08, duration: 0.3 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {stat.label}
              </span>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-slate-400 mt-1">{stat.sublabel}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
