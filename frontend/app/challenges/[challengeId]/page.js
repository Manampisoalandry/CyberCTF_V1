"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Download,
  FileText,
  FolderArchive,
  ShieldCheck,
  Trophy,
  Upload
} from 'lucide-react';
import CursorGlow from '@/components/CursorGlow';
import ChallengeCardSkeleton from '@/components/ChallengeCardSkeleton';
import LoaderOverlay from '@/components/LoaderOverlay';
import TableSkeleton from '@/components/TableSkeleton';
import SubmissionResultModal from '@/components/SubmissionResultModal';
import HintsPanel from '@/components/HintsPanel';
import Toast from '@/components/Toast';
import { apiRequest, buildAssetUrl, downloadFile } from '@/lib/api';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '@/lib/auth';
import { createRealtimeClient } from '@/lib/realtime';

function StatBadge({ icon: Icon, label, value, tone = 'neutral' }) {
  return (
    <div className={`mini-stat mini-stat-${tone}`}>
      <span className="mini-stat-icon"><Icon size={14} /></span>
      <span className="mini-stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getActorInitials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function buildSolveToast(event) {
  if (!event) return null;

  const suffix = event.firstBlood
    ? 'First Blood'
    : event.solveOrder === 2
      ? '2e solve'
      : event.solveOrder
        ? `Solve #${event.solveOrder}`
        : 'Solve confirmé';

  return {
    type: event.firstBlood ? 'success' : event.solveOrder === 2 ? 'warning' : 'info',
    accent: event.firstBlood ? 'gold' : event.solveOrder === 2 ? 'amber' : 'cyan',
    sound: event.firstBlood ? 'first-blood' : event.solveOrder === 2 ? 'amber' : 'info',
    badge: event.firstBlood ? 'First Blood 🔥' : event.solveOrder === 2 ? '2e solve ⚡' : 'Nouveau solve',
    title: `${event.actorName || 'Participant'} a résolu « ${event.challengeTitle || 'un challenge'} »`,
    description: `${event.challengeType || 'Challenge'} • +${event.totalAwarded || 0} pts • ${suffix}`,
    avatarText: getActorInitials(event.actorName || 'P')
  };
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params?.challengeId;

  const [bootLoading, setBootLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [auth, setAuth] = useState({ token: null, user: null });
  const [challenge, setChallenge] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [flag, setFlag] = useState('');
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [submissionModal, setSubmissionModal] = useState({ open: false, variant: 'success', title: '', message: '' });
  const pageActiveRef = useRef(true);

  const handleHintUnlocked = (hintId, data) => {
    setChallenge((prev) => {
      if (!prev) return prev;
      const nextHints = (prev.hints || []).map((h) => {
        if (h.id !== hintId) return h;
        return { ...h, unlocked: true, content: data?.hint?.content || h.content, unlockedAt: data?.hint?.unlockedAt || h.unlockedAt };
      });
      return { ...prev, hints: nextHints };
    });

    const newPoints = data?.points;
    if (typeof newPoints === 'number') {
      setProfile((prev) => (prev ? { ...prev, points: newPoints } : prev));
      setAuth((prev) => ({ ...prev, user: prev.user ? { ...prev.user, points: newPoints } : prev.user }));
    }
  };

  const currentUserId = profile?.id || profile?._id || auth.user?.id || auth.user?._id;
  const solved = Boolean(challenge?.solvedByMe);
  const firstBloodUserId = challenge?.firstBloodUser?._id || challenge?.firstBloodUser?.id || challenge?.firstBloodUser;
  const isFirstBlood = firstBloodUserId && currentUserId && firstBloodUserId === currentUserId;
  const nextBloodBonus = Number.isFinite(challenge?.nextBloodBonus)
    ? challenge.nextBloodBonus
    : ((challenge?.solvesCount || 0) === 0 ? 80 : (challenge?.solvesCount || 0) === 1 ? 50 : 0);
  const isQuizMode = challenge?.submissionMode === 'quiz' && Array.isArray(challenge?.quizQuestions) && challenge.quizQuestions.length > 0;

  const headerStats = useMemo(() => ({
    points: profile?.points ?? auth.user?.points ?? 0,
    solves: profile?.solvedChallengesCount ?? 0,
    firstBloods: profile?.firstBloods ?? 0
  }), [profile, auth.user]);

  useEffect(() => {
    pageActiveRef.current = true;
    return () => {
      pageActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      const stored = getStoredAuth();

      if (!stored.token || !stored.user) {
        router.replace('/login');
        return;
      }

      setAuth(stored);

      try {
        setLoadError('');
        const [challengeData, profileData] = await Promise.all([
          apiRequest(`/api/challenges/${challengeId}`, { token: stored.token }),
          apiRequest('/api/profile/me', { token: stored.token })
        ]);

        const user = profileData.user || profileData.profile;
        const challengeRow = challengeData.challenge || challengeData;
        setChallenge(challengeRow);
        setProfile(user);
        if (user) {
          setStoredAuth(stored.token, user);
          setAuth({ token: stored.token, user });
        }
      } catch (error) {
        setLoadError(error.message || 'Challenge introuvable.');
        setToast({ type: 'error', message: error.message });
        if (/token|auth|credential/i.test(error.message)) {
          clearStoredAuth();
          router.replace('/login');
        }
      } finally {
        setBootLoading(false);
      }
    };

    if (challengeId) {
      init();
    }
  }, [challengeId, router]);

  useEffect(() => {
    if (!challenge) return;

    setFlag('');
    setQuizAnswers(
      Array.isArray(challenge.quizQuestions)
        ? Array.from({ length: challenge.quizQuestions.length }, () => '')
        : []
    );
  }, [challenge]);

  const refreshData = async () => {
    const [challengeData, profileData] = await Promise.all([
      apiRequest(`/api/challenges/${challengeId}`, { token: auth.token }),
      apiRequest('/api/profile/me', { token: auth.token })
    ]);

    const user = profileData.user || profileData.profile;
    setChallenge(challengeData.challenge || challengeData);
    setProfile(user);

    if (user) {
      setStoredAuth(auth.token, user);
      setAuth((prev) => ({ ...prev, user }));
    }
  };

  const handleSubmit = async () => {
    const body = isQuizMode
      ? { answers: quizAnswers.map((item) => String(item || '').trim()) }
      : { flag: flag.trim() };

    const missing = isQuizMode
      ? body.answers.some((item) => !item) || body.answers.length !== (challenge?.quizQuestions?.length || 0)
      : !body.flag;

    if (missing) {
      setSubmissionModal({
        open: true,
        variant: 'error',
        title: 'Réponse manquante',
        message: isQuizMode
          ? 'Réponds à toutes les questions du quiz avant de soumettre.'
          : 'Saisis une flag avant de soumettre.'
      });
      return;
    }

    try {
      setPageLoading(true);
      const data = await apiRequest(`/api/challenges/${challengeId}/submit`, {
        method: 'POST',
        token: auth.token,
        body
      });
      await refreshData();
      setFlag('');
      setQuizAnswers(Array.from({ length: challenge?.quizQuestions?.length || 0 }, () => ''));
      setSubmissionModal({
        open: true,
        variant: 'success',
        title: 'Félicitations 🎉',
        message: data.message || 'Challenge validé avec succès.'
      });
    } catch (error) {
      const incorrect = /incorrect/i.test(error.message || '');
      if (incorrect) {
        setSubmissionModal({
          open: true,
          variant: 'error',
          title: 'Réponse incorrecte',
          message: 'Ce n’est pas la bonne réponse. Réessaie encore.'
        });
      } else {
        setToast({ type: 'error', message: error.message });
      }
    } finally {
      setPageLoading(false);
    }
  };

  const handleZipDownload = async () => {
    try {
      setPageLoading(true);
      await downloadFile(challenge?.downloadZipUrl || `/api/challenges/${challengeId}/download.zip`, {
        token: auth.token,
        filename: `${String(challenge?.title || 'challenge').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-files.zip`
      });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.token) return undefined;

    const socket = createRealtimeClient(auth.token);
    if (!socket) return undefined;

    socket.on('activity:solve', (event) => {
      if (String(event?.actorId || '') === String(currentUserId || '')) return;
      const payload = buildSolveToast(event);
      if (payload) setToast(payload);
    });

    socket.on('ticket:update', (payload) => {
      setToast({ type: 'info', message: payload?.message || 'Mise à jour sur un ticket.' });
    });

    socket.on('hint:unlocked', (payload) => {
      if (!pageActiveRef.current) return;
      if (payload?.challengeId && String(payload.challengeId) === String(challengeId)) {
        handleHintUnlocked(payload.hintId, { hint: payload, points: payload.points });
      }
      setToast({
        type: 'success',
        message: Number(payload?.cost || 0) > 0
          ? `Hint déverrouillé sur ${payload?.challengeTitle || 'ce challenge'} (-${payload?.cost} pts).`
          : `Hint gratuit déverrouillé sur ${payload?.challengeTitle || 'ce challenge'}.`
      });
    });

    socket.on('challenge:unlocked', (payload) => {
      setToast({ type: 'success', message: `Nouveau challenge débloqué : ${payload?.title || 'Challenge'}` });
    });

    return () => {
      socket.disconnect();
    };
  }, [auth.token, challengeId, currentUserId]);

  if (bootLoading) {
    return (
      <div className="page">
        <CursorGlow />
        <div className="container detail-shell">
          <div className="glass card">
            <ChallengeCardSkeleton />
          </div>
          <div className="split-grid" style={{ marginTop: 18 }}>
            <TableSkeleton rows={3} cols={3} />
            <TableSkeleton rows={3} cols={2} />
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="page">
        <CursorGlow />
        <Toast toast={toast} onClose={() => setToast(null)} />
        <SubmissionResultModal
          open={submissionModal.open}
          variant={submissionModal.variant}
          title={submissionModal.title}
          message={submissionModal.message}
          onClose={() => setSubmissionModal((prev) => ({ ...prev, open: false }))}
        />
        <div className="container detail-shell">
          <div className="glass card empty-box">
            {loadError || 'Challenge introuvable.'} <Link href="/dashboard" className="text-link">Retour dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <SubmissionResultModal
        open={submissionModal.open}
        variant={submissionModal.variant}
        title={submissionModal.title}
        message={submissionModal.message}
        onClose={() => setSubmissionModal((prev) => ({ ...prev, open: false }))}
      />
      <LoaderOverlay show={pageLoading} label="Traitement..." />

      <div className="page">
        <CursorGlow />
        <div className="container detail-shell">
          <div className="detail-topbar row-between">
            <Link href="/dashboard" className="btn btn-soft row">
              <ArrowLeft size={16} />
              Retour aux challenges
            </Link>
            <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
              <StatBadge icon={Trophy} label="Points" value={headerStats.points} tone="pink" />
              <StatBadge icon={ShieldCheck} label="Solves" value={headerStats.solves} tone="green" />
              <StatBadge icon={Crown} label="FB" value={headerStats.firstBloods} tone="gold" />
            </div>
          </div>

          <section className="glass detail-hero">
            <div className="hero-orb hero-orb-left" />
            <div className="hero-orb hero-orb-right" />
            <div className="detail-hero-grid">
              <div className="stack" style={{ gap: 16 }}>
                <div className="eyebrow">Challenge</div>
                <div className="row-wrap">
                  <h1 className="title-xl" style={{ marginRight: 8 }}>{challenge.title}</h1>
                  <span className={`badge badge-type-${String(challenge.type || 'misc').toLowerCase()}`}>{challenge.type}</span>
                  <span className={`badge badge-${String(challenge.difficulty || 'easy').toLowerCase()}`}>{challenge.difficulty}</span>
                  {isFirstBlood && <span className="badge badge-gold"><Crown size={12} /> First Blood</span>}
                  {solved && <span className="badge badge-success-soft"><CheckCircle2 size={12} /> Résolu</span>}
                  {isQuizMode && <span className="badge badge-outline-neutral">Quiz OSINT</span>}
                </div>
                <p className="detail-description text-muted">{challenge.description}</p>
                <div className="row-wrap">
                  <span className="file-chip file-chip-hot">{challenge.points} points</span>
                  <span className="file-chip">{challenge.solvesCount ?? 0} solve(s)</span>
                  {nextBloodBonus > 0 ? (
                    <span className="file-chip file-chip-soft">Bonus vitesse restant: +{nextBloodBonus}</span>
                  ) : (
                    <span className="file-chip">Bonus vitesse épuisé</span>
                  )}
                  <span className="file-chip">{challenge.files?.length || 0} fichier(s)</span>
                </div>
              </div>

              <div className="glass detail-submit-panel">
                <div className="eyebrow">Soumission</div>
                <h2 className="title-md">{isQuizMode ? 'Valider le quiz' : 'Valider la flag'}</h2>
                <div className="stack" style={{ gap: 12 }}>
                  {isQuizMode ? (
                    <div className="quiz-inline-card">
                      <div className="quiz-inline-title">Quiz OSINT multi-questions</div>
                      <div className="stack" style={{ gap: 12 }}>
                        {challenge.quizQuestions.map((question, questionIndex) => (
                          <div key={question.id || `detail-question-${questionIndex}`} className="stack" style={{ gap: 8 }}>
                            <div className="quiz-inline-title">{questionIndex + 1}. {question.question}</div>
                            <div className="quiz-option-list">
                              {question.options.map((option) => (
                                <label key={`${questionIndex}-${option}`} className={`quiz-option ${quizAnswers[questionIndex] === option ? 'is-selected' : ''}`}>
                                  <input
                                    type="radio"
                                    name={`detail-quiz-${challengeId}-${questionIndex}`}
                                    checked={quizAnswers[questionIndex] === option}
                                    disabled={solved || pageLoading}
                                    onChange={() => setQuizAnswers((prev) => {
                                      const next = Array.isArray(prev)
                                        ? [...prev]
                                        : Array.from({ length: challenge.quizQuestions.length }, () => '');
                                      next[questionIndex] = option;
                                      return next;
                                    })}
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <input
                      className="input"
                      placeholder="CCOI26{...}"
                      value={flag}
                      disabled={solved || pageLoading}
                      onChange={(event) => setFlag(event.target.value)}
                    />
                  )}
                  <button className="btn btn-accent row" onClick={handleSubmit} disabled={solved || pageLoading}>
                    <Upload size={16} />
                    {solved ? 'Déjà résolu' : isQuizMode ? 'Valider le quiz' : 'Soumettre la flag'}
                  </button>
                  <button
                    className="btn btn-secondary-glow row"
                    onClick={handleZipDownload}
                    disabled={pageLoading || !(challenge.files?.length > 0)}
                  >
                    <FolderArchive size={16} />
                    Télécharger tout en ZIP
                  </button>
                  <div className={`notice ${solved ? 'notice-success' : 'notice-subtle'}`}>
                    {solved
                      ? 'Challenge déjà validé sur ton compte.'
                      : isQuizMode
                        ? 'Réponds correctement à toutes les questions pour valider ce quiz OSINT.'
                        : 'Le backend bloque les doubles clics, applique un rate limit et donne +80 au 1er solveur, +50 au 2e.'}
                  </div>
                </div>
              </div>
            </div>
          </section>

            <HintsPanel
              challengeId={challengeId}
              hints={challenge?.hints || []}
              token={auth.token}
              onUnlocked={handleHintUnlocked}
            />


          <div className="detail-grid">
            <section className="glass card detail-section">
              <div className="section-heading">
                <span className="section-pill"><FileText size={14} /> Description complète</span>
              </div>
              <div className="prose-block text-muted">{challenge.description}</div>
            </section>

            <section className="glass card detail-section">
              <div className="section-heading row-between">
                <span className="section-pill"><Download size={14} /> Fichiers du challenge</span>
                <button
                  className="btn btn-outline-accent row"
                  onClick={handleZipDownload}
                  disabled={pageLoading || !(challenge.files?.length > 0)}
                >
                  <FolderArchive size={16} /> ZIP complet
                </button>
              </div>

              {challenge.files?.length ? (
                <div className="files-list">
                  {challenge.files.map((file) => (
                    <a
                      key={file.id || file._id || file.url}
                      className="file-row"
                      href={buildAssetUrl(file.url)}
                      target="_blank"
                      rel="noreferrer"
                      download
                    >
                      <div className="file-meta">
                        <div className="file-name">{file.originalName}</div>
                        <div className="file-sub">{file.mimetype || 'fichier'} • {file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'taille inconnue'}</div>
                      </div>
                      <span className="file-action"><Download size={16} /></span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="notice notice-subtle">Aucun fichier attaché à ce challenge.</div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
