import { getPlatformPolicies, getPricingProfiles } from '@/features/policies/server/policy-actions';
import { AdminPoliciesView } from './_components/admin-policies-view';
import { PricingProfilesPanel } from './_components/pricing-profiles-panel';

export const dynamic = 'force-dynamic';

export default async function AdminPoliciesPage() {
  const [policies, profiles] = await Promise.all([getPlatformPolicies(), getPricingProfiles()]);
  return <div className="space-y-7"><AdminPoliciesView initialPolicies={policies} /><PricingProfilesPanel profiles={profiles} /></div>;
}
