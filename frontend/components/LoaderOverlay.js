"use client";

import { motion } from 'framer-motion';

export default function LoaderOverlay({ show, label = 'Chargement...' }) {
  if (!show) return null;

  return (
    <div className="loader-overlay">
      <motion.div
        className="loader-stack"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="loader-radar">
          <svg viewBox="0 0 120 120" className="loader-radar-svg" aria-hidden="true">
            <circle cx="60" cy="60" r="46" className="loader-ring-soft" />
            <circle cx="60" cy="60" r="30" className="loader-ring-soft" />
            <circle cx="60" cy="60" r="14" className="loader-ring-soft" />
            <circle cx="60" cy="60" r="54" className="loader-ring-outer" />
            <path d="M60 60L104 44" className="loader-sweep" />
            <circle cx="92" cy="34" r="4" className="loader-dot" />
            <circle cx="38" cy="82" r="3" className="loader-dot loader-dot-alt" />
          </svg>
          <div className="spinner" />
        </div>
        <div className="loader-bars" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="loader-label">{label}</div>
      </motion.div>
    </div>
  );
}
