import { notFound } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { SESSION_PRICING, SessionType } from '@/shared/types';
import { CheckInWidget } from '@/features/attendance/components/checkin-widget';
import { getSession } from '@/features/auth/server/session';

interface AttendPageProps {
  params: {
    token: string;
  };
}

export default async function AttendPage({ params }: AttendPageProps) {
  const { token } = params;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      tutor: { select: { name: true } },
    },
  });

  if (!session) {
    notFound();
  }

  const userSession = await getSession();
  let alreadyCheckedIn = false;

  if (userSession?.userId) {
    const record = await prisma.attendanceRecord.findUnique({
      where: {
        session_id_student_id: {
          session_id: session.id,
          student_id: userSession.userId,
        },
      },
    });
    alreadyCheckedIn = !!record;
  }

  const sessionData = {
    title: session.title,
    sessionType: session.session_type as SessionType,
    startTime: session.start_time.toISOString(),
    deadline: session.deadline.toISOString(),
    price: SESSION_PRICING[session.session_type as SessionType],
    tutorName: session.tutor.name,
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <CheckInWidget
        token={token}
        session={sessionData}
        studentId={userSession?.userId}
        initialCheckedIn={alreadyCheckedIn}
      />
    </div>
  );
}
