export type Role = 'ADMIN' | 'TUTOR' | 'STUDENT';

export type SessionType = 'PRIVATE' | 'GROUP';

export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type TransactionType = 'ADMIN_DEPOSIT' | 'SESSION_DEDUCTION' | 'REFUND';

export const SESSION_PRICING: Record<SessionType, number> = {
  PRIVATE: 500.00,
  GROUP: 375.00,
};

export interface SessionWithTutor {
  id: string;
  tutorId: string;
  tutorName: string;
  title: string;
  sessionType: SessionType;
  startTime: Date | string;
  endTime: Date | string;
  deadline: Date | string;
  token: string | null;
  status: SessionStatus;
  price: number;
}

export interface CheckInVerificationResult {
  success: boolean;
  statusCode: number;
  message: string;
  sessionTitle?: string;
  deductedAmount?: number;
  newBalance?: number;
  isOverdraft?: boolean;
}

export interface TutorVolumeKPIs {
  tutorId: string;
  tutorName: string;
  monthlySessionCount: number;
  lifetimeSessionCount: number;
  monthlyAttendedStudents: number;
  lifetimeAttendedStudents: number;
}
