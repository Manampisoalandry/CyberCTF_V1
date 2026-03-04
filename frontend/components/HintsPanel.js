"use client";

import { useMemo, useState } from 'react';
import { Lock, Unlock, Sparkles } from 'lucide-react';
import LoaderOverlay from '@/components/LoaderOverlay';
import Toast from '@/components/Toast';
import { apiRequest } from '@/lib/api';

function formatUnlockDate(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return '';
  }
}

function HintRow({ hint, onUnlock, disabled }) {
  const isLocked = !hint.unlocked;
  const label = hint.isFree ? 'Free' : `${hint.cost} pts`;
  const unlockLabel = formatUnlockDate(hint.unlockedAt);

  return (
    <div className="hint-row">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <span className={`hint-lock ${isLocked ? 'hint-lock-locked' : 'hint-lock-unlocked'}`}>
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </span>
          <div>
            <div className="hint-title">{hint.title || 'Hint'}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
          </div>
        </div>

        {isLocked ? (
          <button className="btn btn-outline-accent" onClick={onUnlock} disabled={disabled}>
            <Sparkles size={16} />
            Déverrouiller
          </button>
        ) : (
          <span className="badge badge-outline-green">Déjà déverrouillé</span>
        )}
      </div>

      {!isLocked && (
        <>
          {unlockLabel ? (
            <div className="notice notice-subtle" style={{ marginTop: 10, marginBottom: 10 }}>
              Déverrouillé le {unlockLabel}
            </div>
          ) : null}
          <div className="hint-content">{hint.content}</div>
        </>
      )}
    </div>
  );
}

export default function HintsPanel({ challengeId, hints = [], token, onUnlocked }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const lockedCount = useMemo(
    () => (hints || []).filter((h) => !h.unlocked).length,
    [hints]
  );

  const unlockHint = async (hint) => {
    try {
      setBusy(true);
      const data = await apiRequest(`/api/challenges/${challengeId}/hints/${hint.id}/unlock`, {
        method: 'POST',
        token
      });
      onUnlocked?.(hint.id, data);
      setToast({ type: data?.alreadyUnlocked ? 'info' : 'success', message: data.message || 'Hint unlocked.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  };

  if (!hints.length) return null;

  return (
    <section className="glass card" style={{ padding: 18 }}>
      {busy && <LoaderOverlay label="Déverrouillage..." />}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="eyebrow">Hints</div>
          <h3 className="title-md" style={{ marginTop: 6 }}>Aides disponibles</h3>
        </div>
        {lockedCount > 0 && <span className="badge badge-pink">{lockedCount} verrouillés</span>}
      </div>

      <div className="stack premium-scroll" style={{ marginTop: 14, maxHeight: 420, paddingRight: 6 }}>
        {(hints || []).map((hint) => (
          <HintRow
            key={hint.id}
            hint={hint}
            onUnlock={() => unlockHint(hint)}
            disabled={busy}
          />
        ))}
      </div>
    </section>
  );
}
