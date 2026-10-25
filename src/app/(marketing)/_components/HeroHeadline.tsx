'use client';

import localFont from 'next/font/local';
import { useEffect, useRef } from 'react';

const anton = localFont({
  src: '../../../../public/fonts/Anton-Regular.ttf',
  weight: '400',
  display: 'swap',
});

export function HeroHeadline() {
  const title = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = title.current;
    if (!svg) return;
    const lines = Array.from(svg.querySelectorAll<SVGTextElement>('text'));
    const fitLines = () => {
      for (const line of lines) {
        line.style.fontSize = '116px';
        const width = line.getComputedTextLength();
        if (width > 0) line.style.fontSize = `${(116 * 990) / width}px`;
      }
    };

    void document.fonts.ready.then(fitLines);
    return () => { lines.forEach((line) => { line.style.fontSize = ''; }); };
  }, []);

  return (
    <svg ref={title} className={`relative z-0 block h-auto w-full overflow-visible ${anton.className}`} viewBox="0 0 1000 520" aria-hidden="true">
      <text x="0" y="220" fontSize="242" fill="currentColor" className="text-on-surface">Build from</text>
      <text x="0" y="480" fontSize="261" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" paintOrder="stroke" className="text-brand-primary">curiosity.</text>
    </svg>
  );
}
