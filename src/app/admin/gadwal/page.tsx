import { prisma } from '@/shared/lib/prisma';
import { getGadwalSessions } from '@/features/sessions/server/session-actions';
import { GadwalTable } from '@/features/sessions/components/gadwal-table';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/card';
import { revalidatePath } from 'next/cache';
import { createSession } from '@/features/sessions/server/session-actions';

export const dynamic = 'force-dynamic';

export default async function AdminGadwalPage() {
  const sessions = await getGadwalSessions();
  const tutors = await prisma.user.findMany({
    where: { role: 'TUTOR' },
    select: { id: true, name: true, email: true },
  });

  async function handleCreateSession(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const tutorId = formData.get('tutorId') as string;
    const sessionType = formData.get('sessionType') as 'PRIVATE' | 'GROUP';
    const startTimeStr = formData.get('startTime') as string;
    const durationHours = parseInt((formData.get('duration') as string) || '2', 10);

    const start = new Date(startTimeStr);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    await createSession({
      title,
      tutorId,
      sessionType,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

    revalidatePath('/admin/gadwal');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Admin Gadwal Management (إدارة الجدول)
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Schedule private and group tutoring sessions. Check-in deadlines are strictly set to 4 hours from start time.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Schedule New Session</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreateSession} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Session Title</label>
              <input
                name="title"
                required
                placeholder="e.g. Advanced Calculus - Chapter 4 Review"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assign Tutor</label>
              <select
                name="tutorId"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select Tutor</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Session Type</label>
              <select
                name="sessionType"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="PRIVATE">PRIVATE (500.00 EGP)</option>
                <option value="GROUP">GROUP (375.00 EGP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
              <input
                name="startTime"
                type="datetime-local"
                required
                defaultValue={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Duration (Hours)</label>
              <input
                name="duration"
                type="number"
                min="1"
                max="8"
                defaultValue="2"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm"
              >
                Generate Session & Token
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <GadwalTable sessions={sessions} />
    </div>
  );
}
