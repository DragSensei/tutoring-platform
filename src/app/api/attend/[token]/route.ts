import { NextRequest, NextResponse } from 'next/server';
import { executeStudentCheckIn } from '@/features/attendance/server/checkin-action';
import { getSession } from '@/features/auth/server/session';

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ message: 'Token parameter missing' }, { status: 400 });
    }

    // Try session cookie first; fallback to request body studentId
    const session = await getSession();
    let studentId = session?.userId;

    if (!studentId) {
      try {
        const body = await req.json();
        studentId = body.studentId;
      } catch {
        // empty body
      }
    }

    if (!studentId) {
      return NextResponse.json(
        { message: 'Authentication required: please log in or provide studentId' },
        { status: 401 }
      );
    }

    const result = await executeStudentCheckIn({
      token,
      studentId,
    });

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error during attendance check-in' },
      { status: 500 }
    );
  }
}
