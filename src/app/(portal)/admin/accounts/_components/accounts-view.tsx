'use client';

import * as React from 'react';
import type { KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, UserRoundSearch } from 'lucide-react';
import { Badge, type BadgeProps } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { formatDateTime } from '@/shared/utils/date-format';
import { TablePagination } from '@/shared/components/table-pagination';
import { useTablePagination } from '@/shared/hooks/use-table-pagination';
import { TableToolbar } from '@/shared/components/table-toolbar';
import { matchesTableSearch } from '@/shared/utils/table-search';
import type { AccountListItem } from './accounts-data';
import { AccountCreateForm } from './account-create-form';
import { ReferralSourceManager } from './referral-source-manager';
import { StudentCsvImport } from './student-csv-import';
import type { ReferralSourceItem } from '@/features/accounts/server/account-actions';

interface AccountsViewProps {
  accounts: AccountListItem[];
  referralSources: ReferralSourceItem[];
  initialReferralSourceId: string;
}

function getRoleBadgeVariant(role: AccountListItem['role']): BadgeProps['variant'] {
  if (role === 'ADMIN') return 'default';
  if (role === 'TUTOR') return 'secondary';
  return 'outline';
}

export function AccountsView({ accounts, referralSources, initialReferralSourceId }: AccountsViewProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState(initialReferralSourceId);
  const filteredAccounts = accounts.filter((account) =>
    matchesTableSearch([account.name, account.email, account.phone, account.roleLabel, account.referralSourceName], search) &&
    (!roleFilter || account.role === roleFilter) && (!sourceFilter || (sourceFilter === '__none__' ? !account.referralSourceId : account.referralSourceId === sourceFilter))
  );
  const pagination = useTablePagination(filteredAccounts);

  const openAccount = (id: string) => router.push(`/admin/accounts/${id}`);
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openAccount(id);
  };

  return (
    <div className="space-y-8 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-5 min-h-[92px]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-subtle border border-brand-border/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-primary">
              Admin Console
            </span>
            <span className="text-xs font-semibold text-stone-500">Identity & Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">
            Registered Accounts
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 line-clamp-1">
            Browse students, faculty mentors, and administrators registered on the platform.
          </p>
        </div>
        <div className="self-start sm:self-auto rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 tabular-nums">
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </div>
      </div>

      <AccountCreateForm referralSources={referralSources} />
      <ReferralSourceManager sources={referralSources} />
      <StudentCsvImport />

      {accounts.length === 0 ? (
        <Card className="w-full rounded-2xl border-stone-200/80 bg-white shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
              <UserRoundSearch className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-stone-900">No registered accounts</h2>
            <p className="mt-1 max-w-md text-sm text-stone-500">
              Accounts will appear here after users are registered in the platform.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full rounded-2xl border-stone-200/80 bg-white shadow-xs overflow-hidden">
          <CardHeader className="border-b border-stone-100">
            <CardTitle className="text-lg">Account Directory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              resultCount={filteredAccounts.length}
              onClear={() => { setSearch(''); setRoleFilter(''); setSourceFilter(''); }}
              searchPlaceholder="Search accounts, email, or phone"
              filters={[
                { id: 'role', label: 'role', value: roleFilter, onChange: setRoleFilter, options: [{ value: 'ADMIN', label: 'Admin' }, { value: 'TUTOR', label: 'Faculty mentor' }, { value: 'STUDENT', label: 'Student' }] },
                { id: 'referralSource', label: 'source', value: sourceFilter, onChange: setSourceFilter, options: [{ value: '__none__', label: 'None' }, ...referralSources.map((source) => ({ value: source.id, label: `${source.name} · ${source.kind.toLowerCase()}` }))] },
              ]}
            />
            {filteredAccounts.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-stone-500">No accounts match these filters.</div>
            ) : (
              <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[760px] text-left text-sm text-stone-700">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-5 py-3">Account</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Student source</th>
                    <th className="px-5 py-3">Registered</th>
                    <th className="w-16 px-5 py-3">
                      <span className="sr-only">Open account</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {pagination.items.map((account) => (
                    <tr
                      key={account.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`View ${account.name || 'incomplete profile'} account`}
                      onClick={() => openAccount(account.id)}
                      onKeyDown={(event) => handleRowKeyDown(event, account.id)}
                      className="min-h-[56px] cursor-pointer transition-colors hover:bg-stone-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-stone-900">{account.name || 'Profile incomplete'}</div>
                        <div className="mt-0.5 text-xs text-stone-500 break-all">{account.email || 'Email not provided'}</div>
                      </td>
                      <td className="px-5 py-4 text-stone-600">{account.phone || 'Phone not provided'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2"><Badge variant={getRoleBadgeVariant(account.role)}>{account.roleLabel}</Badge><Badge variant="outline">{account.accountStatus.toLowerCase().replaceAll('_', ' ')}</Badge></div>
                      </td>
                      <td className="px-5 py-4 text-stone-600">{account.role === 'STUDENT' ? account.referralSourceName || 'None' : '—'}</td>
                      <td className="px-5 py-4 text-stone-600 tabular-nums">
                        {formatDateTime(account.createdAt, { includeYear: true })}
                      </td>
                      <td className="px-5 py-4 text-right text-stone-400">
                        <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-stone-100 xl:hidden">
              {pagination.items.map((account) => (
                <Link
                  key={account.id}
                  href={`/admin/accounts/${account.id}`}
                  className="flex min-h-[88px] items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-900">{account.name || 'Profile incomplete'}</span>
                      <Badge variant={getRoleBadgeVariant(account.role)}>{account.roleLabel}</Badge>
                      <Badge variant="outline">{account.accountStatus.toLowerCase().replaceAll('_', ' ')}</Badge>
                    </div>
                    <p className="mt-1 break-all text-xs text-stone-500">{account.email || 'Email not provided'}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {account.phone || 'Phone not provided'} · Registered {formatDateTime(account.createdAt, { includeYear: true })}
                    </p>
                    {account.role === 'STUDENT' && <p className="mt-1 text-xs text-stone-500">Source: {account.referralSourceName || 'None'}</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                </Link>
              ))}
            </div>
            <TablePagination
              itemCount={filteredAccounts.length}
              page={pagination.page}
              pageCount={pagination.pageCount}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
            />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
