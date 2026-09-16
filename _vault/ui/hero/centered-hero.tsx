import Link from "next/link";

interface CenteredHeroProps {
  badgeText?: string;
  titleRegular: string;
  titleHighlight: string;
  description: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
}

export function CenteredHero({
  badgeText,
  titleRegular,
  titleHighlight,
  description,
  primaryCtaText,
  primaryCtaHref,
  secondaryCtaText,
  secondaryCtaHref,
}: CenteredHeroProps) {
  return (
    <section className="flex flex-col items-center justify-center text-center px-4 py-12 sm:py-16">
      {badgeText && (
        <div className="mb-4 inline-flex items-center rounded-full border border-brand-border bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand-primary">
          {badgeText}
        </div>
      )}
      <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.15]">
        {titleRegular}{" "}
        <span className="text-brand-primary">{titleHighlight}</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg leading-relaxed">
        {description}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
        <Link
          href={primaryCtaHref}
          className="w-full sm:w-auto rounded-xl bg-brand-primary px-7 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95"
        >
          {primaryCtaText}
        </Link>
        {secondaryCtaText && secondaryCtaHref && (
          <Link
            href={secondaryCtaHref}
            className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            {secondaryCtaText}
          </Link>
        )}
      </div>
    </section>
  );
}
