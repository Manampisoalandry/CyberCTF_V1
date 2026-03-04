"use client";

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function GlitchText({ children, className = '' }) {
  const rootRef = useRef(null);
  const pinkRef = useRef(null);
  const greenRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) return undefined;

    const ctx = gsap.context(() => {
      gsap.set([pinkRef.current, greenRef.current], { opacity: 0.0 });

      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 2.2 });
      timeline
        .to(pinkRef.current, { opacity: 0.55, x: 2, duration: 0.06, ease: 'power2.out' })
        .to(greenRef.current, { opacity: 0.45, x: -2, duration: 0.06, ease: 'power2.out' }, '<')
        .to(rootRef.current, { skewX: 3, duration: 0.05, ease: 'power2.out' }, '<')
        .to(rootRef.current, { skewX: 0, duration: 0.12, ease: 'power2.out' })
        .to([pinkRef.current, greenRef.current], { opacity: 0, x: 0, duration: 0.14, ease: 'power2.out' }, '<');
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <span className={`glitch-text ${className}`.trim()} ref={rootRef}>
      <span className="glitch-layer glitch-base">{children}</span>
      <span className="glitch-layer glitch-pink" ref={pinkRef} aria-hidden="true">{children}</span>
      <span className="glitch-layer glitch-green" ref={greenRef} aria-hidden="true">{children}</span>
    </span>
  );
}
