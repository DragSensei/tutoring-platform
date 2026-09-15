import { NextRequest, NextResponse } from 'next/server';
import { adminDepositSchema } from '@/features/wallets/schemas';
import { adminDeposit } from '@/features/wallets/server/wallet-actions';
import { getSession } from '@/features/auth/server/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = adminDepositSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid deposit input' },
        { status: 400 }
      );
    }

    const session = await getSession();
    // In production, enforce role === 'ADMIN'

    const result = await adminDeposit({
      studentId: validation.data.studentId,
      amount: validation.data.amount,
      adminUserId: session?.userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process admin deposit' },
      { status: 500 }
    );
  }
}
