import Link from "next/link";
import Image from "next/image";

interface NavLink {
  label: string;
  href: string;
}

interface PublicHeaderProps {
  brandName: string;
  logoSrc: string;
  links: NavLink[];
  authHref: string;
  authLabel?: string;
}

export function PublicHeader({
  brandName,
  logoSrc,
  links,
  authHref,
  authLabel = "Sign In",
}: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="relative h-9 w-9 overflow-hidden rounded-lg">
            <Image src={logoSrc} alt={brandName} fill className="object-contain" priority />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">{brandName}</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={authHref}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95"
          >
            {authLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
