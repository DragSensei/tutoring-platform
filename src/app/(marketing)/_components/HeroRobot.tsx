'use client';

import { useEffect, useRef } from 'react';
import { HERO_ROBOT_PALETTE as colors } from './hero-robot-palette';

type HeroRobotProps = { className?: string };

export function HeroRobot({ className }: HeroRobotProps) {
  const leftPupil = useRef<SVGCircleElement>(null);
  const rightPupil = useRef<SVGCircleElement>(null);
  const robot = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const leftEye = leftPupil.current;
    const rightEye = rightPupil.current;
    const svg = robot.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!leftEye || !rightEye || !svg) return;

    let frame = 0;
    let latest: PointerEvent | null = null;

    const place = (pupil: SVGCircleElement, event: PointerEvent | null) => {
      const matrix = pupil.getScreenCTM();
      if (!matrix) return;
      const inverse = matrix.inverse();
      const centerX = Number(pupil.dataset.centerX);
      const centerY = Number(pupil.dataset.centerY);
      let x = 0;
      let y = 0;
      if (event && !reducedMotion.matches) {
        const pointer = svg.createSVGPoint();
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        const localPointer = pointer.matrixTransform(inverse);
        x = localPointer.x - centerX;
        y = localPointer.y - centerY;
        const distance = Math.hypot(x / 6, y / 12);
        const scale = Math.min(1, 1 / Math.max(distance, 0.001));
        x *= scale;
        y *= scale;
      }
      pupil.setAttribute('cx', String(centerX + x));
      pupil.setAttribute('cy', String(centerY + y));
    };

    const update = () => {
      frame = 0;
      place(leftEye, latest);
      place(rightEye, latest);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
      latest = event;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const reset = () => {
      latest = null;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onMotionChange = () => reset();

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    reducedMotion.addEventListener('change', onMotionChange);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      reducedMotion.removeEventListener('change', onMotionChange);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg ref={robot} className={className} xmlns="http://www.w3.org/2000/svg" viewBox="70 0 510 500" role="img" aria-labelledby="hero-robot-title hero-robot-description">
      <title id="hero-robot-title">A friendly workshop robot</title>
      <desc id="hero-robot-description">An original ivory and crimson robot illustration with a dark face, bright eyes, articulated arms and oversized wheels.</desc>
      <defs>
        <linearGradient id="hero-shell" x1="0" y1="0" x2="1" y2=".8"><stop stopColor={colors.shellHighlight}/><stop offset=".55" stopColor={colors.shellMidtone}/><stop offset="1" stopColor={colors.shellShadow}/></linearGradient>
        <linearGradient id="hero-side" x1="0" y1="0" x2="1" y2="1"><stop stopColor={colors.sideHighlight}/><stop offset="1" stopColor={colors.sideShadow}/></linearGradient>
        <linearGradient id="hero-red" x1="0" y1="0" x2="1" y2="1"><stop stopColor={colors.redHighlight}/><stop offset=".5" stopColor={colors.redMidtone}/><stop offset="1" stopColor={colors.redShadow}/></linearGradient>
        <linearGradient id="hero-glass" x1="0" y1="0" x2=".5" y2="1"><stop stopColor={colors.glassHighlight}/><stop offset="1" stopColor={colors.glassShadow}/></linearGradient>
      </defs>
      <g transform="rotate(7 340 240)" stroke={colors.outline} strokeLinecap="round" strokeLinejoin="round">
        <path d="M323 103V49l23-16" fill="none" strokeWidth="9"/><circle cx="352" cy="25" r="15" fill="url(#hero-red)" strokeWidth="5"/>
        <path d="M223 184l-48 3-26 67 16 43 46 4m265-130 42 12 17 66-17 38-45-2" fill="url(#hero-side)" strokeWidth="7"/>
        <path d="M170 208l-34 6-23 44 16 39 33 4m365-92 34 12 10 38-19 37-29 1" fill="url(#hero-red)" strokeWidth="6"/>
        <circle cx="137" cy="259" r="18" fill={colors.outline} strokeWidth="4"/><circle cx="546" cy="265" r="17" fill={colors.outline} strokeWidth="4"/>
        <path d="M208 137Q204 107 240 95l161-13q30-2 48 24l29 37v174l-44 50-182-3-48-47z" fill="url(#hero-shell)" strokeWidth="7"/>
        <path d="M401 82q30-2 48 24l29 37v174l-44 50-7-222z" fill="url(#hero-side)" strokeWidth="5"/>
        <path d="M209 133q-2-24 31-38l161-13 26 63-211 17z" fill="url(#hero-red)" strokeWidth="6"/>
        <path d="M238 174l162-12q17-1 18 18l3 102q0 17-17 18l-153-1q-17 0-18-17l-3-90q-1-17 8-18z" fill="url(#hero-glass)" strokeWidth="6"/>
        <path d="M247 185l137-9" fill="none" stroke={colors.faceGlint} strokeWidth="4"/>
        <g>
          <rect x="265" y="208" width="24" height="43" rx="12" fill={colors.eye} stroke="none"/>
          <circle ref={leftPupil} data-center-x="277" data-center-y="229.5" cx="277" cy="229.5" r="5.5" fill={colors.outline} stroke="none"/>
        </g>
        <g>
          <rect x="355" y="202" width="24" height="43" rx="12" fill={colors.eye} stroke="none"/>
          <circle ref={rightPupil} data-center-x="367" data-center-y="223.5" cx="367" cy="223.5" r="5.5" fill={colors.outline} stroke="none"/>
        </g>
        <path d="M304 266q23 19 45-2" stroke={colors.redHighlight} strokeWidth="6" fill="none"/>
        <path d="M251 350l-9 44m158-39 13 38" fill="none" strokeWidth="15"/>
        <path d="M211 417q-1-34 29-37t35 31l-3 31-58-1zM393 416q0-32 29-30t32 30l-4 32-60-5z" fill={colors.outline} strokeWidth="6"/>
        <ellipse cx="240" cy="417" rx="14" ry="19" fill="url(#hero-side)" strokeWidth="4"/><ellipse cx="422" cy="422" rx="14" ry="19" fill="url(#hero-side)" strokeWidth="4"/>
        <path d="M273 325h82m-72 10h47" stroke={colors.detail} strokeWidth="4"/><circle cx="389" cy="330" r="7" fill={colors.redMidtone} stroke="none"/>
        <path d="M221 148l17-4" stroke={colors.shellGlint} strokeWidth="4"/>
      </g>
    </svg>
  );
}
