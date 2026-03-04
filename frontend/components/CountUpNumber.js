"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

function parseAnimatedValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { numeric: value, prefix: '', suffix: '', decimals: 0, raw: String(value) };
  }

  const raw = String(value ?? '');
  const match = raw.match(/^([^\d-]*)(-?\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) {
    return { numeric: null, prefix: '', suffix: '', decimals: 0, raw };
  }

  const [, prefix, num, suffix] = match;
  const decimals = (num.split(/[.,]/)[1] || '').length;
  return {
    numeric: Number(num.replace(',', '.')),
    prefix,
    suffix,
    decimals,
    raw
  };
}

export default function CountUpNumber({ value, duration = 1.15, className = '' }) {
  const parsed = useMemo(() => parseAnimatedValue(value), [value]);
  const [display, setDisplay] = useState(parsed.raw);
  const previousRef = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(parsed.numeric)) {
      setDisplay(parsed.raw);
      return undefined;
    }

    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) {
      setDisplay(`${parsed.prefix}${parsed.numeric.toFixed(parsed.decimals)}${parsed.suffix}`);
      previousRef.current = parsed.numeric;
      return undefined;
    }

    const state = { value: previousRef.current };
    const tween = gsap.to(state, {
      value: parsed.numeric,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        const current = parsed.decimals > 0 ? state.value.toFixed(parsed.decimals) : Math.round(state.value).toString();
        setDisplay(`${parsed.prefix}${current}${parsed.suffix}`);
      },
      onComplete: () => {
        previousRef.current = parsed.numeric;
        setDisplay(`${parsed.prefix}${parsed.numeric.toFixed(parsed.decimals)}${parsed.suffix}`);
      }
    });

    return () => tween.kill();
  }, [parsed, duration]);

  return <span className={className}>{display}</span>;
}
