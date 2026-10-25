const steps = [
  { number: '01', title: 'Start with “what if?”', description: 'Notice something interesting. Ask a question. Sketch a possibility.' },
  { number: '02', title: 'Give your idea a shape.', description: 'Connect the pieces and see what happens when an idea meets the real world.' },
  { number: '03', title: 'Discover another way.', description: 'Test, adjust, and let each new attempt teach you something.' },
];

export function PillarsSection() {
  return (
    <section className="landing-journey grid gap-10 px-6 py-14 sm:px-12 sm:py-16 lg:grid-cols-2 lg:gap-[11%] lg:px-20" aria-labelledby="journey-title">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted">The joy of making</p>
        <h2 id="journey-title" className="mt-5 font-serif text-4xl font-normal leading-tight tracking-tight text-text-primary sm:text-5xl">
          A question.<br />A first attempt.<br />A little discovery.
        </h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-text-muted">
          Making gives curiosity somewhere to go. Each attempt is a chance to notice, adjust, and try another way.
        </p>
      </div>
      <div className="border-t border-border-subtle">
        {steps.map((step) => (
          <article key={step.number} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-border-subtle py-6">
            <span className="pt-1 font-mono text-xs text-brand-primary">{step.number}</span>
            <div>
              <h3 className="text-lg font-medium tracking-tight text-text-primary">{step.title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-text-muted">{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
