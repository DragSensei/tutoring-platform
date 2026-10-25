import Link from 'next/link';
import { HeroHeadline } from './HeroHeadline';
import { HeroRobot } from './HeroRobot';

export function HeroSection() {
  return (
    <>
      <section className="landing-hero relative isolate bg-canvas-dark px-6 pb-7 pt-9 text-on-surface sm:px-12 sm:pb-8 sm:pt-12 lg:px-20 lg:pt-16" aria-labelledby="hero-title">
        <div className="mx-auto max-w-screen-2xl">
          <p className="mb-8 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-on-surface/70 lg:mb-12">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            A place for curious minds
          </p>
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] md:gap-4 lg:gap-8">
            <div className="min-w-0">
              <h1 id="hero-title" className="sr-only">Build from curiosity.</h1>
              <HeroHeadline />
              <p className="mt-7 max-w-md text-base leading-7 text-on-surface/80 sm:mt-9 sm:text-lg sm:leading-8">Explore robotics through making, testing, and seeing your ideas take shape.</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-8">
                <Link href="/login" className="inline-flex min-h-12 items-center gap-7 rounded-sm bg-primary-action px-5 font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                  Enter the academy <span aria-hidden="true">↗</span>
                </Link>
                <Link href="/about" className="inline-flex min-h-11 items-center text-on-surface underline decoration-on-surface/40 underline-offset-4 hover:decoration-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                  Explore our approach
                </Link>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[260px] md:max-w-none">
              <div className="absolute inset-x-[12%] bottom-[8%] h-px bg-on-surface/20" aria-hidden="true" />
              <HeroRobot className="pointer-events-none relative block h-auto w-full" />
            </div>
          </div>
          <div className="mt-8 flex justify-between gap-3 border-t border-on-surface/15 pt-5 font-mono text-[10px] uppercase tracking-widest text-on-surface/70 lg:mt-14">
            <span>Imagine. Make. Try again.</span>
            <span className="hidden sm:inline">Big Hero Robotics / The Academy</span>
          </div>
        </div>
      </section>
      <div className="landing-bridge flex items-center justify-between gap-5 border-b border-border-subtle px-6 py-7 sm:px-12 lg:px-20">
        <p className="font-serif text-xl leading-snug tracking-tight sm:text-2xl">The best part of an idea?<br />Finding out what it can become.</p>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-text-muted sm:block">From questions to possibilities</span>
      </div>
    </>
  );
}
