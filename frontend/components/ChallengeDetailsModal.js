"use client";

import { useMemo } from 'react';
import { Download, X } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

function fullUrl(url) {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${getApiUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function ChallengeDetailsModal({ open, onClose, challenge }) {
  const files = useMemo(() => challenge?.files || [], [challenge]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal glass">
        <div className="row-between" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div className="row-wrap" style={{ marginBottom: 8 }}>
              <h2 className="title-lg" style={{ marginRight: 8 }}>{challenge?.title}</h2>
              <span className={`badge badge-type-${String(challenge?.type || 'misc').toLowerCase()}`}>{challenge?.type}</span>
              <span className={`badge badge-${String(challenge?.difficulty || 'easy').toLowerCase()}`}>{challenge?.difficulty}</span>
              <span className="file-chip">{challenge?.points ?? 0} pts</span>
              <span className="file-chip">{challenge?.solvesCount ?? 0} solve(s)</span>
            </div>
            <p className="text-muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {challenge?.description}
            </p>
          </div>
          <button className="btn btn-soft" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="divider" />

        <h3 className="title-md" style={{ marginBottom: 10 }}>Fichiers du challenge</h3>

        {files.length === 0 ? (
          <div className="notice">Aucun fichier à télécharger.</div>
        ) : (
          <div className="files-list">
            {files.map((file) => (
              <a
                key={file.id || file._id || file.url}
                className="file-row"
                href={fullUrl(file.url)}
                target="_blank"
                rel="noreferrer"
                download
              >
                <div className="file-meta">
                  <div className="file-name">{file.originalName}</div>
                  <div className="file-sub">{file.mimetype || 'file'} • {file.size ? `${Math.round(file.size / 1024)} KB` : '—'}</div>
                </div>
                <span className="file-action"><Download size={16} /></span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
