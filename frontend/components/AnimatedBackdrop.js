"use client";

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function AnimatedBackdrop({ variant = 'auth' }) {
  const sceneRef = useRef(null);
  const sweepRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      gsap.to('.scene-glow-a', {
        x: 46,
        y: -28,
        scale: 1.16,
        duration: 8.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('.scene-glow-b', {
        x: -54,
        y: 32,
        scale: 0.9,
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('.scene-glow-c', {
        x: 18,
        y: 22,
        scale: 1.12,
        duration: 9.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('.svg-trace', {
        strokeDashoffset: -240,
        duration: 7,
        ease: 'none',
        repeat: -1,
        stagger: 0.9
      });

      gsap.to('.svg-node', {
        attr: { r: 7.5 },
        duration: 1.65,
        repeat: -1,
        yoyo: true,
        stagger: 0.18,
        ease: 'sine.inOut'
      });

      gsap.to('.svg-pulse-ring', {
        attr: { r: 58 },
        opacity: 0,
        duration: 2.8,
        repeat: -1,
        stagger: 0.45,
        ease: 'power1.out'
      });

      gsap.to('.svg-orbit', {
        rotation: 360,
        transformOrigin: '50% 50%',
        duration: 24,
        repeat: -1,
        ease: 'none'
      });

      gsap.to('.svg-orbit-alt', {
        rotation: -360,
        transformOrigin: '50% 50%',
        duration: 32,
        repeat: -1,
        ease: 'none'
      });

      gsap.to('.svg-diamond', {
        y: -10,
        opacity: 0.4,
        duration: 2.2,
        yoyo: true,
        repeat: -1,
        stagger: 0.15,
        ease: 'sine.inOut'
      });

      gsap.fromTo(
        sweepRef.current,
        { xPercent: -18, yPercent: 8, opacity: 0.12 },
        {
          xPercent: 32,
          yPercent: -10,
          opacity: 0.34,
          duration: 6.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        }
      );
    }, sceneRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className={`svg-scene svg-scene-${variant}`} ref={sceneRef} aria-hidden="true">
      <div className="scene-glow scene-glow-a" />
      <div className="scene-glow scene-glow-b" />
      <div className="scene-glow scene-glow-c" />
      <div className="scene-sweep" ref={sweepRef} />

      <svg className="svg-scene-canvas" viewBox="0 0 1600 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="traceGradient" x1="180" y1="120" x2="1380" y2="820" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(39, 240, 161, 0)" />
            <stop offset="0.32" stopColor="#27F0A1" />
            <stop offset="0.68" stopColor="#67E8F9" />
            <stop offset="1" stopColor="rgba(255, 79, 216, 0.05)" />
          </linearGradient>
          <linearGradient id="traceGradientAlt" x1="340" y1="180" x2="1160" y2="840" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(255, 79, 216, 0)" />
            <stop offset="0.44" stopColor="#FF4FD8" />
            <stop offset="1" stopColor="rgba(39, 240, 161, 0.05)" />
          </linearGradient>
          <radialGradient id="nodeGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0) rotate(90) scale(80)">
            <stop stopColor="#27F0A1" stopOpacity="0.9" />
            <stop offset="1" stopColor="#27F0A1" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g opacity="0.22">
          <circle className="svg-orbit" cx="1180" cy="230" r="150" stroke="rgba(103,232,249,0.22)" strokeWidth="1.2" strokeDasharray="10 16" />
          <circle className="svg-orbit-alt" cx="1180" cy="230" r="105" stroke="rgba(255,79,216,0.28)" strokeWidth="1" strokeDasharray="6 18" />
          <circle className="svg-orbit" cx="420" cy="760" r="110" stroke="rgba(39,240,161,0.2)" strokeWidth="1" strokeDasharray="8 14" />
        </g>

        <g opacity="0.92">
          <path className="svg-trace" d="M150 260C320 200 430 180 540 230C680 294 780 430 960 442C1115 452 1236 330 1440 356" />
          <path className="svg-trace svg-trace-alt" d="M280 720C402 650 472 598 628 604C774 610 842 744 1024 744C1137 744 1284 644 1400 534" />
          <path className="svg-trace svg-trace-faint" d="M240 458C400 478 520 404 660 352C786 304 892 300 980 360C1102 444 1184 572 1360 596" />
        </g>

        <g>
          <circle className="svg-pulse-ring" cx="540" cy="230" r="12" />
          <circle className="svg-pulse-ring" cx="960" cy="442" r="12" />
          <circle className="svg-pulse-ring" cx="1024" cy="744" r="12" />
        </g>

        <g className="svg-diamond-cluster" opacity="0.46">
          <rect className="svg-diamond" x="1140" y="140" width="14" height="14" transform="rotate(45 1147 147)" fill="rgba(39,240,161,0.85)" />
          <rect className="svg-diamond" x="1256" y="262" width="10" height="10" transform="rotate(45 1261 267)" fill="rgba(255,79,216,0.72)" />
          <rect className="svg-diamond" x="356" y="700" width="12" height="12" transform="rotate(45 362 706)" fill="rgba(103,232,249,0.72)" />
          <rect className="svg-diamond" x="486" y="814" width="8" height="8" transform="rotate(45 490 818)" fill="rgba(255,79,216,0.62)" />
        </g>

        <g>
          <circle className="svg-node" cx="150" cy="260" r="5" />
          <circle className="svg-node" cx="540" cy="230" r="5" />
          <circle className="svg-node" cx="960" cy="442" r="5" />
          <circle className="svg-node" cx="1440" cy="356" r="5" />
          <circle className="svg-node svg-node-pink" cx="280" cy="720" r="5" />
          <circle className="svg-node svg-node-pink" cx="1024" cy="744" r="5" />
          <circle className="svg-node svg-node-pink" cx="1400" cy="534" r="5" />
        </g>
      </svg>
    </div>
  );
}
