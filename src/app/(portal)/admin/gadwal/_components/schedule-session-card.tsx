'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { Combobox } from '@/shared/components/combobox';
import { createSession } from '@/features/sessions/server/session-actions';

interface ScheduleSessionCardProps {
  tutors: { id: string; name: string; email: string }[];
}

export function ScheduleSessionCard({ tutors }: ScheduleSessionCardProps) {
  const [selectedTutorId, setSelectedTutorId] = React.useState(tutors[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const tutorOptions = React.useMemo(() => {
    return tutors.map((t) => ({
      value: t.id,
      label: t.name,
      sublabel: t.email,
    }));
  }, [tutors]);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    const title = formData.get('title') as string;
    const tutorId = formData.get('tutorId') as string || selectedTutorId;
    const sessionType = formData.get('sessionType') as 'PRIVATE' | 'GROUP';
    const startTimeStr = formData.get('startTime') as string;
    const durationHours = parseInt((formData.get('duration') as string) || '2', 10);

    const start = new Date(startTimeStr);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    try {
      await createSession({
        title,
        tutorId,
        sessionType,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full min-w-0 max-w-full rounded-2xl border-stone-200/80 bg-white shadow-xs overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-stone-900">Schedule New Session</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Session Title</label>
            <input
              name="title"
              required
              placeholder="e.g. Advanced Calculus - Chapter 4 Review"
              className="min-h-[44px] w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Assign Tutor</label>
            <Combobox
              options={tutorOptions}
              value={selectedTutorId}
              onChange={setSelectedTutorId}
              name="tutorId"
              placeholder="Select Tutor..."
              searchPlaceholder="Search faculty mentors..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Session Type</label>
            <select
              name="sessionType"
              required
              className="min-h-[44px] w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white transition-colors"
            >
              <option value="PRIVATE">PRIVATE (500.00 EGP)</option>
              <option value="GROUP">GROUP (375.00 EGP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Start Time</label>
            <input
              name="startTime"
              type="datetime-local"
              required
              defaultValue={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
              className="min-h-[44px] w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Duration (Hours)</label>
            <input
              name="duration"
              type="number"
              min="1"
              max="8"
              defaultValue="2"
              required
              className="min-h-[44px] w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors"
            />
          </div>

          <div className="lg:col-span-3 pt-4 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-6 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-xs flex items-center justify-center ml-auto disabled:opacity-50"
            >
              {isSubmitting ? 'Scheduling...' : 'Generate Session & Token'}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
