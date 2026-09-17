'use client';

import * as React from 'react';
import { DashboardHeader } from '../../dashboard/_components/DashboardHeader';
import { ClosestSessionTimer } from '../../dashboard/_components/ClosestSessionTimer';
import { SessionSelectionGrid } from '../../dashboard/_components/SessionSelectionGrid';
import type { TutorDashboardData } from '../../dashboard/_components/dashboard-data';

export function TutorAgendaView({
  tutor,
  closestSession,
  sessions,
}: TutorDashboardData) {
  return (
    <div className="space-y-8">
      {/* Faculty Identity Bar */}
      <DashboardHeader tutorName={tutor.name} />

      {/* Top Middle: Live countdown timer with separate boxed units */}
      <ClosestSessionTimer closestSession={closestSession} />

      {/* Underneath: Clickable course cards with session codes & student rosters */}
      <SessionSelectionGrid sessions={sessions} />
    </div>
  );
}
