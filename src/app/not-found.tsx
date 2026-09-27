import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[70vh] w-full items-center justify-center bg-canvas px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-border-subtle bg-white p-8 text-center shadow-sm">
        <p className="font-mono text-sm font-bold tracking-[0.2em] text-brand-primary">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">This page may have moved, or the address may be incorrect.</p>
        <Link href="/" className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">Return to home</Link>
      </section>
    </main>
  );
}
