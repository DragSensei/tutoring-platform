import Link from 'next/link';

const items = [
  { label: 'Overview', href: '/admin/finances' },
  { label: 'Tutor payables', href: '/admin/finances/tutors' },
  { label: 'Sales & referrals', href: '/admin/finances/sales' },
  { label: 'Student receivables', href: '/admin/finances/receivables' },
];

export function FinanceNavigation({ active }: { active: string }) {
  return <nav aria-label="Finance sections" className="flex flex-wrap gap-2 border-b border-border-subtle pb-3">{items.map((item) => <Link key={item.href} href={item.href} aria-current={item.label === active ? 'page' : undefined} className={`inline-flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold ${item.label === active ? 'bg-brand-subtle text-brand-primary' : 'text-text-muted hover:bg-canvas-subtle hover:text-text-primary'}`}>{item.label}</Link>)}</nav>;
}
