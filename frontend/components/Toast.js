"use client";

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Crown, Info, XCircle, Zap } from 'lucide-react';

function playToastSound(mode = 'info') {
  if (typeof window === 'undefined') return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const tones = {
      success: [660, 880],
      warning: [520, 660],
      error: [320, 220],
      info: [540],
      cyan: [540],
      amber: [520, 660],
      gold: [740, 988],
      'first-blood': [740, 988, 1318]
    };

    const sequence = tones[mode] || tones.info;

    sequence.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.08;
      const duration = 0.09;

      osc.type = mode === 'error' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.03, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    });

    const endAt = now + sequence.length * 0.08 + 0.18;
    window.setTimeout(() => {
      if (ctx && typeof ctx.close === 'function') {
        ctx.close().catch(() => undefined);
      }
    }, Math.max(250, Math.round((endAt - now) * 1000)));
  } catch {
    // ignore audio errors
  }
}

function getTypeMeta(toast) {
  const type = toast?.type || 'info';

  if (type === 'success') {
    return {
      icon: toast?.accent === 'gold' ? Crown : CheckCircle2,
      label: toast?.label || (toast?.accent === 'gold' ? 'First blood' : 'Succès'),
      avatarClass: toast?.accent === 'gold' ? 'toast-avatar-gold' : 'toast-avatar-success'
    };
  }

  if (type === 'error') {
    return {
      icon: XCircle,
      label: toast?.label || 'Erreur',
      avatarClass: 'toast-avatar-error'
    };
  }

  if (type === 'warning') {
    return {
      icon: Zap,
      label: toast?.label || 'Alerte',
      avatarClass: 'toast-avatar-warning'
    };
  }

  return {
    icon: Info,
    label: toast?.label || 'Info',
    avatarClass: toast?.accent === 'cyan' ? 'toast-avatar-cyan' : 'toast-avatar-info'
  };
}

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const parts = text.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => onClose?.(), toast?.duration || 3800);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  useEffect(() => {
    if (!toast) return;
    if (toast.silent === true || toast.sound === 'off') return;

    const soundMode = toast.sound || (toast.accent === 'gold' ? 'first-blood' : toast.accent || toast.type || 'info');
    playToastSound(soundMode);
  }, [toast]);

  const { icon: Icon, label, avatarClass } = getTypeMeta(toast || {});
  const title = toast?.title || toast?.message || '';
  const description = toast?.description || '';
  const badge = toast?.badge || label;
  const initials = getInitials(toast?.avatarText || toast?.actorName || toast?.title);

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={title}
          className={`toast toast-${toast.type || 'info'} toast-premium`}
          initial={{ opacity: 0, y: -18, scale: 0.96, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="toast-glow" />
          <div className={`toast-avatar ${avatarClass}`}>
            {initials ? <span>{initials}</span> : <Icon size={16} />}
          </div>

          <div className="toast-copy">
            <div className="toast-topline">
              <span className="toast-badge">{badge}</span>
              <button type="button" className="toast-close" onClick={() => onClose?.()} aria-label="Fermer la notification">×</button>
            </div>
            <div className="toast-title">{title}</div>
            {description ? <div className="toast-description">{description}</div> : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
