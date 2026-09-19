import { getPlatformPolicies } from '@/features/policies/server/policy-actions';
import { AdminPoliciesView } from './_components/admin-policies-view';

export const dynamic = 'force-dynamic';

export default async function AdminPoliciesPage() {
  const policies = await getPlatformPolicies();
  return <AdminPoliciesView initialPolicies={policies} />;
}

