import { NextRequest, NextResponse } from 'next/server';
import { adminDepositSchema } from '@/features/wallets/schemas';
import { adminDeposit } from '@/features/wallets/server/wallet-actions';
import { requireAuth } from '@/features/auth/server/session';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN']);
    const body = await req.json();
    const validation = adminDepositSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid deposit input' },
        { status: 400 }
      );
    }

    const result = await adminDeposit({
      studentId: validation.data.studentId,
      amount: validation.data.amount,
      adminUserId: session?.userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Admin authentication is required' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Admin authentication is required' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Failed to process admin deposit' },
      { status: 500 }
    );
  }
}
