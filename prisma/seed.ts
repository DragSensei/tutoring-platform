import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing records
  await prisma.walletTransaction.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.session.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Sherif Admin',
      email: 'admin@tutoring.com',
      phone: '+201000000001',
      password_hash: passwordHash,
      role: 'ADMIN',
    },
  });

  // 2. Tutors
  const tutor1 = await prisma.user.create({
    data: {
      name: 'Dr. Ahmed Mansour',
      email: 'ahmed@tutoring.com',
      phone: '+201000000002',
      password_hash: passwordHash,
      role: 'TUTOR',
    },
  });

  const tutor2 = await prisma.user.create({
    data: {
      name: 'Eng. Mona Zaki',
      email: 'mona@tutoring.com',
      phone: '+201000000003',
      password_hash: passwordHash,
      role: 'TUTOR',
    },
  });

  // 3. Students & Wallets
  const student1 = await prisma.user.create({
    data: {
      name: 'Karim Mostafa',
      email: 'karim@student.com',
      phone: '+201000000004',
      password_hash: passwordHash,
      role: 'STUDENT',
      wallet: {
        create: {
          balance: new Prisma.Decimal(1250.00),
          is_flagged_overdraft: false,
          transactions: {
            create: {
              amount: new Prisma.Decimal(1250.00),
              transaction_type: 'ADMIN_DEPOSIT',
              created_by_user_id: admin.id,
            },
          },
        },
      },
    },
    include: { wallet: true },
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Salma Hossam',
      email: 'salma@student.com',
      phone: '+201000000005',
      password_hash: passwordHash,
      role: 'STUDENT',
      wallet: {
        create: {
          balance: new Prisma.Decimal(375.00),
          is_flagged_overdraft: false,
          transactions: {
            create: {
              amount: new Prisma.Decimal(375.00),
              transaction_type: 'ADMIN_DEPOSIT',
              created_by_user_id: admin.id,
            },
          },
        },
      },
    },
    include: { wallet: true },
  });

  const student3 = await prisma.user.create({
    data: {
      name: 'Omar Fathy',
      email: 'omar@student.com',
      phone: '+201000000006',
      password_hash: passwordHash,
      role: 'STUDENT',
      wallet: {
        create: {
          balance: new Prisma.Decimal(-125.00), // Credit overdraft
          is_flagged_overdraft: true,
          transactions: {
            create: [
              {
                amount: new Prisma.Decimal(250.00),
                transaction_type: 'ADMIN_DEPOSIT',
                created_by_user_id: admin.id,
              },
              {
                amount: new Prisma.Decimal(-375.00),
                transaction_type: 'SESSION_DEDUCTION',
              },
            ],
          },
        },
      },
    },
    include: { wallet: true },
  });

  // 4. Sessions
  const now = new Date();

  // Active Private Session (1h ago -> deadline in 3h)
  const session1Start = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const session1End = new Date(session1Start.getTime() + 2 * 60 * 60 * 1000);
  const session1Deadline = new Date(session1Start.getTime() + 4 * 60 * 60 * 1000);
  const session1Token = '11111111-2222-3333-4444-555555555555';

  const session1 = await prisma.session.create({
    data: {
      title: 'Advanced Physics: Electromagnetic Fields',
      tutor_id: tutor1.id,
      session_type: 'PRIVATE',
      start_time: session1Start,
      end_time: session1End,
      deadline: session1Deadline,
      token: session1Token,
      status: 'ACTIVE',
    },
  });

  // Active Group Session (30m ago -> deadline in 3.5h)
  const session2Start = new Date(now.getTime() - 30 * 60 * 1000);
  const session2End = new Date(session2Start.getTime() + 2 * 60 * 60 * 1000);
  const session2Deadline = new Date(session2Start.getTime() + 4 * 60 * 60 * 1000);
  const session2Token = '22222222-3333-4444-5555-666666666666';

  const session2 = await prisma.session.create({
    data: {
      title: 'Calculus III: Multivariable Integration Workshop',
      tutor_id: tutor2.id,
      session_type: 'GROUP',
      start_time: session2Start,
      end_time: session2End,
      deadline: session2Deadline,
      token: session2Token,
      status: 'ACTIVE',
    },
  });

  // Expired Session (started 6 hours ago -> deadline was 2 hours ago)
  const expiredStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const expiredEnd = new Date(expiredStart.getTime() + 2 * 60 * 60 * 1000);
  const expiredDeadline = new Date(expiredStart.getTime() + 4 * 60 * 60 * 1000);
  const expiredToken = '99999999-8888-7777-6666-555555555555';

  await prisma.session.create({
    data: {
      title: 'Organic Chemistry: Reaction Mechanisms (Archived)',
      tutor_id: tutor1.id,
      session_type: 'GROUP',
      start_time: expiredStart,
      end_time: expiredEnd,
      deadline: expiredDeadline,
      token: expiredToken,
      status: 'COMPLETED',
    },
  });

  // Seed one attendance
  await prisma.attendanceRecord.create({
    data: {
      session_id: session1.id,
      student_id: student1.id,
      attended_at: new Date(session1Start.getTime() + 15 * 60 * 1000),
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('Active Sessions created:');
  console.log(`- Private: http://localhost:3000/attend/${session1Token}`);
  console.log(`- Group:   http://localhost:3000/attend/${session2Token}`);
  console.log(`- Expired: http://localhost:3000/attend/${expiredToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
