export type SeedTutorKey = 'omnia' | 'ahmed' | 'omar';

export interface CanonicalSeedStudent {
  key: string;
  name: string;
  phone?: string;
  identity: string;
  profileIncomplete?: boolean;
}

export interface CanonicalSeedSeries {
  key: string;
  title: string;
  tutor: SeedTutorKey;
  weekday: number;
  startMinute: number;
  durationMinutes: number;
  studentKeys: string[];
}

export const canonicalTutors = [
  { key: 'omnia', name: 'Omnia Samy', email: null, phone: null },
  { key: 'ahmed', name: 'Ahmed Alaa', email: 'ahmed.alaa@bigherorobotics.com', phone: null },
  { key: 'omar', name: 'Omar Ashraf', email: 'omar.ashraf@bigherorobotics.com', phone: null },
] as const satisfies ReadonlyArray<{ key: SeedTutorKey; name: string; email: string | null; phone: string | null }>;

export const canonicalStudents: readonly CanonicalSeedStudent[] = [
  { key: 'abdelrahman-seham', name: 'Abdelrahman', identity: 'guardian:+201027960760:abdelrahman' },
  { key: 'adham', name: 'Adham', phone: '+201019401211', identity: 'student:+201019401211' },
  { key: 'ahmed-fatma', name: 'Ahmed Mohamed', identity: 'guardian:+201011799802:ahmed' },
  { key: 'ahmed-khaled', name: 'Ahmed Khaled Rizk', identity: 'guardian:+201026903093:ahmed' },
  { key: 'amira-student', name: 'Amira Emad Yehya Khalifa', phone: '+201227121078', identity: 'student:+201227121078' },
  { key: 'bassant', name: 'Bassant', phone: '+201006226068', identity: 'student:+201006226068' },
  { key: 'bayan', name: 'Bayan Mohammed Zarou', phone: '+966554776179', identity: 'student:+966554776179' },
  { key: 'eissa-hadeer', name: 'Eissa', identity: 'guardian:+201001014369:eissa' },
  { key: 'farida', name: 'Farida Amr Othman', identity: 'guardian:+201005656711:farida' },
  { key: 'fatima', name: 'Fatima Mohamed', identity: 'guardian:+201066552199:fatima' },
  { key: 'hazem', name: 'Hazem Ramadan', identity: 'guardian:+201001507014:hazem' },
  { key: 'jana', name: 'Jana Ahmed', identity: 'guardian:+201097314855:jana' },
  { key: 'khadiga', name: 'Khadiga Mohamed', identity: 'guardian:+201066552199:khadiga' },
  { key: 'laial-aya', name: 'Laial', identity: 'guardian:+201203317774:laial' },
  { key: 'malek', name: 'Malek Mohamed', identity: 'guardian:+201143737156:malek' },
  { key: 'marwan', name: 'Marwan Moataz Abdel-ghany', identity: 'guardian:+201009700729:marwan' },
  { key: 'mazen', name: 'Mazen', phone: '+201110101483', identity: 'student:+201110101483' },
  { key: 'saif', name: 'Saif Hatem Soliman', identity: 'guardian:+966530215693:saif' },
  { key: 'student-12135347', name: 'Student +20 12 12135347', phone: '+201212135347', identity: 'student:+201212135347', profileIncomplete: true },
  { key: 'tasneem', name: 'Tasneem', phone: '+218917004665', identity: 'student:+218917004665' },
  { key: 'youssef-ibrahim', name: 'Youssef Ibrahim', identity: 'guardian:+201156555570:youssef' },
];

// Weekdays use the canonical recurrence convention: Sunday=0 through Saturday=6.
// Each source Group remains a separate SessionSeries with its own participant list.
export const canonicalSeries: readonly CanonicalSeedSeries[] = [
  { key: 'omnia-thu18', title: 'P3L1 · Electronics · Jana, Malek, Marwan', tutor: 'omnia', weekday: 4, startMinute: 1080, durationMinutes: 120, studentKeys: ['jana', 'malek', 'marwan'] },
  { key: 'omnia-sun1730', title: 'P3L1 · Electronics · Sunday group', tutor: 'omnia', weekday: 0, startMinute: 1050, durationMinutes: 120, studentKeys: ['laial-aya', 'ahmed-fatma', 'hazem', 'farida'] },
  { key: 'omnia-fri20', title: 'P3L1 · Electronics · Tasneem and Amira', tutor: 'omnia', weekday: 5, startMinute: 1200, durationMinutes: 120, studentKeys: ['tasneem', 'amira-student'] },
  { key: 'omnia-sat20', title: 'P3L1 · Electronics · Bayan', tutor: 'omnia', weekday: 6, startMinute: 1200, durationMinutes: 120, studentKeys: ['bayan'] },
  { key: 'omnia-sat10', title: 'P3L1 · Electronics · Youssef and Student 12135347', tutor: 'omnia', weekday: 6, startMinute: 600, durationMinutes: 120, studentKeys: ['youssef-ibrahim', 'student-12135347'] },
  { key: 'omnia-tue16', title: 'P3 · Electronics · Saif', tutor: 'omnia', weekday: 2, startMinute: 960, durationMinutes: 120, studentKeys: ['saif'] },
  { key: 'omnia-fri1530', title: 'P3 · Electronics · Khadiga and Fatima', tutor: 'omnia', weekday: 5, startMinute: 930, durationMinutes: 120, studentKeys: ['khadiga', 'fatima'] },
  { key: 'omnia-sat11', title: 'P3 · Electronics · Abdelrahman', tutor: 'omnia', weekday: 6, startMinute: 660, durationMinutes: 120, studentKeys: ['abdelrahman-seham'] },
  // Repository evidence records Omnia's Wednesday 14:00 group as P1L1 Lego;
  // the monthly message calls it P3L1, so retain the proven source mapping as-is.
  { key: 'omnia-wed14-p1', title: 'P1L1 · Lego · Abdelrahman', tutor: 'omnia', weekday: 3, startMinute: 840, durationMinutes: 120, studentKeys: ['abdelrahman-seham'] },
  { key: 'ahmed-fri16', title: 'P3L1 · Electronics · Eissa (Ahmed)', tutor: 'ahmed', weekday: 5, startMinute: 960, durationMinutes: 120, studentKeys: ['eissa-hadeer'] },
  { key: 'ahmed-mon1630', title: 'P3L1 · Electronics · Ahmed Khaled Rizk', tutor: 'ahmed', weekday: 1, startMinute: 990, durationMinutes: 120, studentKeys: ['ahmed-khaled'] },
  { key: 'ahmed-sat17', title: 'P3L1 · Electronics · Adham', tutor: 'ahmed', weekday: 6, startMinute: 1020, durationMinutes: 120, studentKeys: ['adham'] },
  { key: 'ahmed-sat18', title: 'P3L1 · Electronics · Mazen', tutor: 'ahmed', weekday: 6, startMinute: 1080, durationMinutes: 120, studentKeys: ['mazen'] },
  { key: 'omar-sun19', title: 'P3L1 · Electronics · Bassant', tutor: 'omar', weekday: 0, startMinute: 1140, durationMinutes: 120, studentKeys: ['bassant'] },
  { key: 'omar-wed18-unassigned', title: 'Omar Ashraf · Wednesday assignment (roster unresolved)', tutor: 'omar', weekday: 3, startMinute: 1080, durationMinutes: 120, studentKeys: [] },
];

export const legacyDemoStudentEmails = [
  'karim@student.com',
  'salma@student.com',
  'omar@student.com',
  'nour@student.com',
] as const;

export const legacyDemoPhoneNumbers = ['+201000000001', '+201000000002', '+201000000003'] as const;

export const legacyDemoSessionTitles = [
  'Electronics Level 1: Arduino & Circuit Logic',
  'PictoBlox Track: Computational Game Design',
  'Robotics Level 2: Sumo Bots & Autonomous Avoidance',
  'Private Track: 1-on-1 Embedded C++ Mentorship',
] as const;
