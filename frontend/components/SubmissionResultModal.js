"use client";

import { CheckCircle2, RotateCcw, X } from 'lucide-react';

export default function SubmissionResultModal({ open, variant = 'success', title, message, onClose }) {
  if (!open) return null;

  const success = variant === 'success';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal glass submit-result-modal" onClick={(event) => event.stopPropagation()}>
        <button className="btn btn-soft btn-icon submit-result-close" onClick={onClose} aria-label="Fermer">
          <X size={16} />
        </button>

        <div className={`submit-result-icon ${success ? 'is-success' : 'is-error'}`}>
          {success ? <CheckCircle2 size={26} /> : <RotateCcw size={26} />}
        </div>

        <div className="eyebrow">{success ? 'Soumission validée' : 'Soumission refusée'}</div>
        <h2 className="title-lg submit-result-title">{title}</h2>
        <p className="text-muted submit-result-copy">{message}</p>

        <button className={`btn ${success ? 'btn-primary' : 'btn-accent'} submit-result-btn`} onClick={onClose}>
          {success ? 'Continuer' : 'Réessayer'}
        </button>
      </div>
    </div>
  );
}
