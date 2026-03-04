"use client";

import { useEffect, useRef } from 'react';

function createParticles(count, width, height) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    r: Math.random() * 1.6 + 0.6,
    hue: Math.random() > 0.6 ? 'pink' : 'green'
  }));
}

export default function CyberParticles({ density = 42, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return undefined;

    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (media?.matches) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let frame = 0;
    let animationId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];

    const resize = () => {
      const bounds = canvas.parentElement?.getBoundingClientRect() || canvas.getBoundingClientRect();
      width = Math.max(320, Math.floor(bounds.width));
      height = Math.max(320, Math.floor(bounds.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const targetCount = Math.max(20, Math.round((width * height) / 28000 * (density / 42)));
      particles = createParticles(targetCount, width, height);
    };

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(39, 240, 161, 0.04)');
      gradient.addColorStop(0.5, 'rgba(103, 232, 249, 0.02)');
      gradient.addColorStop(1, 'rgba(255, 79, 216, 0.04)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const sweepX = (frame * 1.6) % (width + 240) - 120;
      const beam = ctx.createLinearGradient(sweepX - 120, 0, sweepX + 120, 0);
      beam.addColorStop(0, 'rgba(255,255,255,0)');
      beam.addColorStop(0.5, 'rgba(39,240,161,0.05)');
      beam.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = height + 10;
        if (particle.y > height + 10) particle.y = -10;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = particle.hue === 'pink' ? 'rgba(255,79,216,0.85)' : 'rgba(39,240,161,0.82)';
        ctx.shadowBlur = 12;
        ctx.shadowColor = particle.hue === 'pink' ? 'rgba(255,79,216,0.55)' : 'rgba(39,240,161,0.45)';
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 120) continue;

          const alpha = (1 - dist / 120) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.strokeStyle = particle.hue === other.hue
            ? particle.hue === 'pink'
              ? `rgba(255,79,216,${alpha})`
              : `rgba(39,240,161,${alpha})`
            : `rgba(103,232,249,${alpha * 0.8})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animationId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement || canvas);
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, [density]);

  return <canvas ref={canvasRef} className={`cyber-particles ${className}`.trim()} aria-hidden="true" />;
}
