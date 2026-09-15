import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/features/auth/schemas';
import { authenticateUser } from '@/features/auth/server/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const result = await authenticateUser(validation.data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication internal server error' },
      { status: 500 }
    );
  }
}
