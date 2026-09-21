import { NextRequest, NextResponse } from 'next/server';
import { executeStudentCheckIn } from '@/features/attendance/server/checkin-action';
import { getSession } from '@/features/auth/server/session';

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ message: 'Token parameter missing' }, { status: 400 });
    }

    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json(
        { message: 'Student authentication is required' },
        { status: 401 }
      );
    }

    const result = await executeStudentCheckIn({
      token,
      studentId: session.userId,
    });

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error during attendance check-in' },
      { status: 500 }
    );
  }
}
