import { getPlatformPolicies, getPricingProfiles, getStudentMonthlyPricingPolicies } from '@/features/policies/server/policy-actions';
import { AdminPoliciesView } from './_components/admin-policies-view';
import { PricingProfilesPanel } from './_components/pricing-profiles-panel';
import { StudentMonthlyPricingPanel } from './_components/student-monthly-pricing-panel';

export const dynamic = 'force-dynamic';

export default async function AdminPoliciesPage() {
  const [policies, profiles, monthlyPrices] = await Promise.all([getPlatformPolicies(), getPricingProfiles(), getStudentMonthlyPricingPolicies()]);
  return <div className="space-y-7"><AdminPoliciesView initialPolicies={policies} /><PricingProfilesPanel profiles={profiles} /><StudentMonthlyPricingPanel policies={monthlyPrices} /></div>;
}
