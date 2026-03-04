"use client";

import { useEffect, useState } from 'react';

export default function CursorGlow() {
  const [pos, setPos] = useState({ x: -500, y: -500 });

  useEffect(() => {
    const handleMove = (event) => {
      setPos({
        x: event.clientX - 110,
        y: event.clientY - 110
      });
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div
      className="cursor-glow"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
    />
  );
}
