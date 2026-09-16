import { notFound } from 'next/navigation';
import { CheckInWidget } from '@/features/attendance/components/checkin-widget';
import { getAttendSessionData } from './_components/attend-session-data';

interface AttendPageProps {
  params: {
    token: string;
  };
}

export default async function AttendPage({ params }: AttendPageProps) {
  const data = await getAttendSessionData(params.token);

  if (!data) {
    notFound();
  }

  return (
    <div className="max-w-xl mx-auto py-12">
      <CheckInWidget
        token={params.token}
        session={data.sessionData}
        studentId={data.userId}
        initialCheckedIn={data.alreadyCheckedIn}
      />
    </div>
  );
}
