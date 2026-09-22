'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpenCheck, Check, Copy, GraduationCap, ReceiptText, ShieldCheck } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Button } from '@/shared/components/button';
import { issueAdminAccountSetupLink, issueAdminPasswordResetLink } from '../../actions';
import { formatEGP } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/date-format';
import type {
  AccountDetail,
  AdminAccountDetail,
  StudentAccountDetail,
  TutorAccountDetail,
} from '../../_components/accounts-data';

interface AccountDetailViewProps {
  account: AccountDetail;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-stone-900">{value}</dd>
    </div>
  );
}

function SetupLinkPanel({ account }: { account: AccountDetail }) {
  const [isPending, startTransition] = React.useTransition();
  const [accessUrl, setAccessUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  if (account.role === 'ADMIN') return null;
  const isActive = account.accountStatus === 'ACTIVE';

  function issueLink() {
    setError(null);
    setAccessUrl(null);
    setCopied(false);
    startTransition(async () => {
      try {
        if (isActive) {
          const result = await issueAdminPasswordResetLink(account.id);
          setAccessUrl(`${window.location.origin}/login/reset?token=${encodeURIComponent(result.resetToken)}`);
        } else {
          const result = await issueAdminAccountSetupLink(account.id);
          setAccessUrl(`${window.location.origin}/login/setup?token=${encodeURIComponent(result.setupToken)}`);
        }
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Unable to issue this access link');
      }
    });
  }

  return (
    <Card className="rounded-2xl border-stone-200/80 bg-white shadow-xs">
      <CardHeader className="border-b border-stone-100"><CardTitle className="text-lg">{isActive ? 'Password reset access' : 'Account setup access'}</CardTitle></CardHeader>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm text-stone-600">{isActive ? 'Issue a one-time password reset link for this account. Reset changes only the password; profile, role, and lifecycle status are unchanged.' : `Issue a new one-time setup link if this ${account.role === 'TUTOR' ? 'Tutor' : 'Student'} has not finished setup.`} Existing passwords and token values are never shown.</p>
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={issueLink} disabled={isPending}>{isPending ? 'Issuing…' : isActive ? 'Issue / reissue password reset link' : 'Issue / reissue setup link'}</Button>
        {accessUrl && <div className="flex flex-col gap-2 sm:flex-row"><code className="min-h-[44px] min-w-0 flex-1 break-all rounded-lg border border-brand-border/70 bg-brand-subtle px-3 py-2.5 text-xs text-stone-700">{accessUrl}</code><Button type="button" variant="outline" className="min-h-[44px] shrink-0" onClick={() => { void navigator.clipboard.writeText(accessUrl).then(() => setCopied(true)); }}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? 'Copied' : 'Copy link'}</Button></div>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}
      </CardContent>
    </Card>
  );
}

function StudentDetails({ account }: { account: StudentAccountDetail }) {
  const { wallet, recentAttendances, attendanceCount } = account.student;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-stone-200/80 bg-white shadow-xs">
        <CardHeader className="flex-row items-center justify-between gap-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Student record</CardTitle>
              <p className="mt-1 text-sm text-stone-500">Wallet and attendance information</p>
            </div>
          </div>
          <Badge variant="outline">{attendanceCount} attendances</Badge>
        </CardHeader>
        <CardContent className="pt-6">
          {wallet ? (
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <InfoField label="Wallet balance" value={formatEGP(wallet.balance)} />
              <InfoField
                label="Wallet status"
                value={wallet.isFlaggedOverdraft ? 'Overdraft flagged' : 'Good standing'}
              />
              <InfoField
                label="Wallet opened"
                value={formatDateTime(wallet.createdAt, { includeYear: true })}
              />
              <InfoField
                label="Wallet updated"
                value={formatDateTime(wallet.updatedAt, { includeYear: true })}
              />
            </dl>
          ) : (
            <p className="text-sm text-stone-500">No wallet is registered for this student.</p>
          )}
        </CardContent>
      </Card>

      <ActivityCard title="Recent attendance" empty={recentAttendances.length === 0}>
        {recentAttendances.map((attendance) => (
          <li key={attendance.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-stone-900">{attendance.sessionTitle}</p>
              <p className="mt-1 text-xs text-stone-500">
                {attendance.sessionType} · Faculty mentor: {attendance.tutorName || 'Profile incomplete'}
              </p>
            </div>
            <div className="text-left text-xs text-stone-500 tabular-nums sm:text-right">
              <p>Session {formatDateTime(attendance.sessionStart, { includeYear: true })}</p>
              <p className="mt-1">Checked in {formatDateTime(attendance.attendedAt, { includeYear: true })}</p>
            </div>
          </li>
        ))}
      </ActivityCard>
    </div>
  );
}

function TutorDetails({ account }: { account: TutorAccountDetail }) {
  const { recentSessions, sessionCount } = account.tutor;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-stone-200/80 bg-white shadow-xs">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand-primary">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Faculty mentor record</p>
              <p className="mt-1 text-sm text-stone-500">Sessions assigned to this mentor</p>
            </div>
          </div>
          <Badge variant="secondary">{sessionCount} taught sessions</Badge>
        </CardContent>
      </Card>

      <ActivityCard title="Recent sessions" empty={recentSessions.length === 0}>
        {recentSessions.map((session) => (
          <li key={session.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-stone-900">{session.title}</p>
              <p className="mt-1 text-xs text-stone-500">
                {session.sessionType} · {session.attendanceCount} recorded attendances
              </p>
            </div>
            <div className="text-left sm:text-right">
              <Badge variant="outline">{session.status}</Badge>
              <p className="mt-2 text-xs text-stone-500 tabular-nums">
                {formatDateTime(session.startTime, { includeYear: true })}
              </p>
            </div>
          </li>
        ))}
      </ActivityCard>
    </div>
  );
}

function AdminDetails({ account }: { account: AdminAccountDetail }) {
  const { recentTransactions, transactionCount } = account.admin;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-stone-200/80 bg-white shadow-xs">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Administrator record</p>
              <p className="mt-1 text-sm text-stone-500">Recorded wallet actions created by this admin</p>
            </div>
          </div>
          <Badge>{transactionCount} wallet actions</Badge>
        </CardContent>
      </Card>

      <ActivityCard title="Recent wallet activity" empty={recentTransactions.length === 0}>
        {recentTransactions.map((transaction) => (
          <li key={transaction.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
              <div>
                <p className="font-semibold text-stone-900">{transaction.studentName || 'Profile incomplete'}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {transaction.transactionType.replaceAll('_', ' ')}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold text-stone-900 tabular-nums">{formatEGP(transaction.amount)}</p>
              <p className="mt-1 text-xs text-stone-500 tabular-nums">
                {formatDateTime(transaction.createdAt, { includeYear: true })}
              </p>
            </div>
          </li>
        ))}
      </ActivityCard>
    </div>
  );
}

function ActivityCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-stone-200/80 bg-white shadow-xs">
      <CardHeader className="border-b border-stone-100">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {empty ? (
          <p className="px-5 py-8 text-center text-sm text-stone-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AccountDetailView({ account }: AccountDetailViewProps) {
  return (
    <div className="space-y-8 w-full min-w-0">
      <div className="flex min-h-[92px] flex-col gap-4 border-b border-stone-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Admin Console
            </span>
            <Badge variant="outline">{account.roleLabel}</Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{account.name || 'Profile incomplete'}</h1>
          <p className="mt-1 break-all text-xs text-stone-500 sm:text-sm">{account.email || 'Email not provided'}</p>
        </div>
        <Link
          href="/admin/accounts"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
        </Link>
      </div>

      <Card className="rounded-2xl border-stone-200/80 bg-white shadow-xs">
        <CardHeader className="border-b border-stone-100">
          <CardTitle className="text-lg">Account information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Name" value={account.name || 'Not provided'} />
            <InfoField label="Email" value={account.email || 'Not provided'} />
            <InfoField label="Phone" value={account.phone || 'Not provided'} />
            <InfoField label="Account type" value={account.roleLabel} />
            <InfoField label="Lifecycle" value={account.accountStatus.replaceAll('_', ' ')} />
            <InfoField
              label="Registered"
              value={formatDateTime(account.createdAt, { includeYear: true })}
            />
            <InfoField
              label="Last updated"
              value={formatDateTime(account.updatedAt, { includeYear: true })}
            />
          </dl>
        </CardContent>
      </Card>

      <SetupLinkPanel account={account} />

      {account.role === 'STUDENT' && <StudentDetails account={account} />}
      {account.role === 'TUTOR' && <TutorDetails account={account} />}
      {account.role === 'ADMIN' && <AdminDetails account={account} />}
    </div>
  );
}
