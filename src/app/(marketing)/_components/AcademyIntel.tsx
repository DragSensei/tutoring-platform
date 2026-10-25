import Link from 'next/link';

export function AcademyIntel() {
  return (
    <section className="landing-closing border-t border-border-subtle px-6 py-9 sm:px-12 lg:px-20" aria-label="Academy information">
      <ul className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-text-muted">
        <li>Ages 6 to 26</li>
        <li>Egyptian Engineers Syndicate Certified</li>
        <li>20+ Branches Across Egypt</li>
        <li>FLL &amp; VEX Competition Teams</li>
      </ul>
      <div className="mt-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="font-serif text-2xl leading-tight tracking-tight text-text-primary">Curious about the academy?</p>
        <Link href="/about" className="inline-flex min-h-11 items-center text-sm text-text-primary underline decoration-border-strong underline-offset-4 hover:decoration-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">
          Get to know our approach ↗
        </Link>
      </div>
    </section>
  );
}
