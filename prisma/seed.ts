import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Big Hero Robotics Academy database...');

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
      email: 'admin@bigherorobotics.com',
      phone: '+201000000001',
      password_hash: passwordHash,
      role: 'ADMIN',
    },
  });

  // 2. Faculty / Tutors (Domain faculty from client brief)
  const tutor1 = await prisma.user.create({
    data: {
      name: 'Eng. Omar Ashraf',
      email: 'omar.ashraf@bigherorobotics.com',
      phone: '+201000000002',
      password_hash: passwordHash,
      role: 'TUTOR',
    },
  });

  const tutor2 = await prisma.user.create({
    data: {
      name: 'Eng. Ahmed Alaa',
      email: 'ahmed.alaa@bigherorobotics.com',
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
          balance: new Prisma.Decimal(1500.00),
          is_flagged_overdraft: false,
          transactions: {
            create: {
              amount: new Prisma.Decimal(1500.00),
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
          balance: new Prisma.Decimal(1500.00),
          is_flagged_overdraft: false,
          transactions: {
            create: {
              amount: new Prisma.Decimal(1500.00),
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
          balance: new Prisma.Decimal(-375.00), // Credit overdraft
          is_flagged_overdraft: true,
          transactions: {
            create: [
              {
                amount: new Prisma.Decimal(375.00),
                transaction_type: 'ADMIN_DEPOSIT',
                created_by_user_id: admin.id,
              },
              {
                amount: new Prisma.Decimal(-750.00),
                transaction_type: 'SESSION_DEDUCTION',
              },
            ],
          },
        },
      },
    },
    include: { wallet: true },
  });

  const student4 = await prisma.user.create({
    data: {
      name: 'Nour El-Din',
      email: 'nour@student.com',
      phone: '+201000000007',
      password_hash: passwordHash,
      role: 'STUDENT',
      wallet: {
        create: {
          balance: new Prisma.Decimal(1500.00),
          is_flagged_overdraft: false,
          transactions: {
            create: {
              amount: new Prisma.Decimal(1500.00),
              transaction_type: 'ADMIN_DEPOSIT',
              created_by_user_id: admin.id,
            },
          },
        },
      },
    },
    include: { wallet: true },
  });

  // 4. Curricular Course Sessions (Big Hero Domain Tracks)
  const now = new Date();

  // Session A: Upcoming in 2 hours 15 mins (Closest Session Next Due)
  const sessionAStart = new Date(now.getTime() + (2 * 3600 + 15 * 60) * 1000);
  const sessionAEnd = new Date(sessionAStart.getTime() + 2 * 3600 * 1000);
  const sessionADeadline = new Date(sessionAStart.getTime() + 4 * 3600 * 1000);
  const sessionAToken = '11111111-2222-3333-4444-555555555555';

  const sessionA = await prisma.session.create({
    data: {
      title: 'Electronics Level 1: Arduino & Circuit Logic',
      tutor_id: tutor1.id,
      session_type: 'GROUP',
      start_time: sessionAStart,
      end_time: sessionAEnd,
      deadline: sessionADeadline,
      token: sessionAToken,
      status: 'SCHEDULED',
    },
  });

  // Session B: Active Now (Started 30m ago, 4h deadline in 3.5h)
  const sessionBStart = new Date(now.getTime() - 30 * 60 * 1000);
  const sessionBEnd = new Date(sessionBStart.getTime() + 2 * 3600 * 1000);
  const sessionBDeadline = new Date(sessionBStart.getTime() + 4 * 3600 * 1000);
  const sessionBToken = '22222222-3333-4444-5555-666666666666';

  const sessionB = await prisma.session.create({
    data: {
      title: 'PictoBlox Track: Computational Game Design',
      tutor_id: tutor1.id,
      session_type: 'GROUP',
      start_time: sessionBStart,
      end_time: sessionBEnd,
      deadline: sessionBDeadline,
      token: sessionBToken,
      status: 'ACTIVE',
    },
  });

  // Session C: Robotics Level 2 (Sumo & Obstacle Avoidance) - Tomorrow
  const sessionCStart = new Date(now.getTime() + 26 * 3600 * 1000);
  const sessionCEnd = new Date(sessionCStart.getTime() + 2 * 3600 * 1000);
  const sessionCDeadline = new Date(sessionCStart.getTime() + 4 * 3600 * 1000);
  const sessionCToken = '33333333-4444-5555-6666-777777777777';

  await prisma.session.create({
    data: {
      title: 'Robotics Level 2: Sumo Bots & Autonomous Avoidance',
      tutor_id: tutor1.id,
      session_type: 'GROUP',
      start_time: sessionCStart,
      end_time: sessionCEnd,
      deadline: sessionCDeadline,
      token: sessionCToken,
      status: 'SCHEDULED',
    },
  });

  // Session D: Private 1-on-1 C++ Mentorship
  const sessionDStart = new Date(now.getTime() + 48 * 3600 * 1000);
  const sessionDEnd = new Date(sessionDStart.getTime() + 2 * 3600 * 1000);
  const sessionDDeadline = new Date(sessionDStart.getTime() + 4 * 3600 * 1000);
  const sessionDToken = '44444444-5555-6666-7777-888888888888';

  await prisma.session.create({
    data: {
      title: 'Private Track: 1-on-1 Embedded C++ Mentorship',
      tutor_id: tutor1.id,
      session_type: 'PRIVATE',
      start_time: sessionDStart,
      end_time: sessionDEnd,
      deadline: sessionDDeadline,
      token: sessionDToken,
      status: 'SCHEDULED',
    },
  });

  // 5. Seed Attendance Proofs (Students in courses)
  // 3 students in Session A
  await prisma.attendanceRecord.createMany({
    data: [
      { session_id: sessionA.id, student_id: student1.id },
      { session_id: sessionA.id, student_id: student2.id },
      { session_id: sessionA.id, student_id: student3.id },
    ],
  });

  // 4 students in Session B (Full group capacity)
  await prisma.attendanceRecord.createMany({
    data: [
      { session_id: sessionB.id, student_id: student1.id },
      { session_id: sessionB.id, student_id: student2.id },
      { session_id: sessionB.id, student_id: student3.id },
      { session_id: sessionB.id, student_id: student4.id },
    ],
  });

  console.log('✅ Big Hero Robotics Academy database successfully seeded!');
  console.log(`- Faculty Tutor: Eng. Omar Ashraf (${tutor1.id})`);
  console.log(`- Closest Session Next Due: ${sessionA.title} (Starts in ~2h 15m)`);
  console.log(`- Active Session: ${sessionB.title} (Check-in open)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
