"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Flag,
  MessageSquare,
  Search,
  Trophy,
  User
} from 'lucide-react';
import CategoryTabs from '@/components/CategoryTabs';
import ChallengeCard from '@/components/ChallengeCard';
import ChallengeCardSkeleton from '@/components/ChallengeCardSkeleton';
import DashboardShell from '@/components/DashboardShell';
import CountUpNumber from '@/components/CountUpNumber';
import LeaderboardTable from '@/components/LeaderboardTable';
import LoaderOverlay from '@/components/LoaderOverlay';
import SubmissionResultModal from '@/components/SubmissionResultModal';
import TableSkeleton from '@/components/TableSkeleton';
import TicketsPanel from '@/components/TicketsPanel';
import Toast from '@/components/Toast';
import { apiRequest } from '@/lib/api';
import { clearStoredAuth, getStoredAuth, isAdminUser, setStoredAuth } from '@/lib/auth';
import { createRealtimeClient } from '@/lib/realtime';

function StatCard({ label, value, accent = 'neutral' }) {
  return (
    <motion.div
      className={`glass stat-card stat-card-${accent} stat-card-pro`}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -5, scale: 1.01 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.28 }}
    >
      <div className="stat-card-grid" />
      <div className="stat-card-shine" />
      <div className="stat-label">{label}</div>
      <div className="stat-value"><CountUpNumber value={value} /></div>
    </motion.div>
  );
}

function getDefaultResponseValue(challenge) {
  if (challenge?.submissionMode === 'quiz' && Array.isArray(challenge?.quizQuestions)) {
    return Array.from({ length: challenge.quizQuestions.length }, () => '');
  }

  return '';
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

  const type = event.firstBlood ? 'success' : event.solveOrder === 2 ? 'warning' : 'info';

  return {
    type,
    accent: event.firstBlood ? 'gold' : event.solveOrder === 2 ? 'amber' : 'cyan',
    sound: event.firstBlood ? 'first-blood' : event.solveOrder === 2 ? 'amber' : 'info',
    badge: event.firstBlood ? 'First Blood 🔥' : event.solveOrder === 2 ? '2e solve ⚡' : 'Nouveau solve',
    title: `${event.actorName || 'Participant'} a résolu « ${event.challengeTitle || 'un challenge'} »`,
    description: `${event.challengeType || 'Challenge'} • +${event.totalAwarded || 0} pts • ${suffix}`,
    avatarText: getActorInitials(event.actorName || 'P')
  };
}

export default function ParticipantDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('challenges');
  const activeTabRef = useRef('challenges');
  const [bootLoading, setBootLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [auth, setAuth] = useState({ token: null, user: null });

  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileStats, setProfileStats] = useState({ rank: '-', solvedChallengesCount: 0, firstBloods: 0, points: 0 });
  const [profileForm, setProfileForm] = useState({ username: '', email: '', bio: '' });
  const [ticketUnread, setTicketUnread] = useState(0);
  const [ticketsRefreshSignal, setTicketsRefreshSignal] = useState(0);
  const [toastQueue, setToastQueue] = useState([]);
  const [submissionInputs, setSubmissionInputs] = useState({});
  const [submittingChallengeId, setSubmittingChallengeId] = useState(null);
  const [filters, setFilters] = useState({ q: '', type: 'All', difficulty: 'All', sort: 'new' });
  const [submissionModal, setSubmissionModal] = useState({ open: false, variant: 'success', title: '', message: '' });

  const currentUserId = profile?.id || profile?._id || auth.user?.id || auth.user?._id;

  const queueToastMessage = (payload) => {
    if (!payload?.message) return;
    setToastQueue((prev) => [...prev, payload]);
  };

  const loadAll = async (token) => {
    const [challengeData, profileData, leaderboardData, ticketData] = await Promise.all([
      apiRequest('/api/challenges', { token }),
      apiRequest('/api/profile/me', { token }),
      apiRequest('/api/leaderboard', { token }),
      apiRequest('/api/tickets/unread-count', { token })
    ]);

    const challengeRows = challengeData.challenges || challengeData.items || challengeData || [];
    const profileRow = profileData.user || profileData.profile || profileData;
    const statsRow = profileData.stats || {};
    const leaderboardRows = leaderboardData.users || leaderboardData.leaderboard || leaderboardData || [];

    setChallenges(challengeRows);
    setProfile(profileRow);
    setProfileStats({
      rank: statsRow.rank ?? '-',
      solvedChallengesCount: statsRow.solvedChallengesCount ?? profileRow?.solvedChallengesCount ?? profileRow?.solvedCount ?? 0,
      firstBloods: statsRow.firstBloods ?? profileRow?.firstBloods ?? 0,
      points: statsRow.points ?? profileRow?.points ?? 0
    });
    setProfileForm({
      username: profileRow?.username || '',
      email: profileRow?.email || '',
      bio: profileRow?.bio || ''
    });
    setLeaderboard(leaderboardRows);
    setTicketUnread(ticketData?.unread ?? 0);

    if (profileRow) {
      setStoredAuth(token, profileRow);
      setAuth((prev) => ({ ...prev, user: profileRow }));
    }
  };

  useEffect(() => {
    if (!toast && toastQueue.length) {
      const [next, ...rest] = toastQueue;
      setToast(next);
      setToastQueue(rest);
    }
  }, [toast, toastQueue]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const init = async () => {
      const stored = getStoredAuth();

      if (!stored.token || !stored.user) {
        router.replace('/login');
        return;
      }

      if (isAdminUser(stored.user)) {
        router.replace('/admin');
        return;
      }

      setAuth(stored);

      try {
        await loadAll(stored.token);
      } catch (error) {
        setToast({ type: 'error', message: error.message });
        clearStoredAuth();
        router.replace('/login');
        return;
      } finally {
        setBootLoading(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!auth.token) return undefined;

    const socket = createRealtimeClient(auth.token);
    if (!socket) return undefined;

    socket.on('activity:solve', (event) => {
      if (!event?.id) return;

      const isSelf = String(event.actorId || '') === String(currentUserId || '');
      if (!isSelf) {
        const payload = buildSolveToast(event);
        if (payload) queueToastMessage(payload);
      }
    });

    socket.on('ticket:update', (payload) => {
      setTicketUnread((prev) => (Number.isFinite(Number(payload?.unreadCount)) ? Number(payload.unreadCount) : prev + 1));
      setTicketsRefreshSignal((prev) => prev + 1);

      queueToastMessage({
        type: 'info',
        message: payload?.message || 'Mise à jour sur un ticket.'
      });
    });

    socket.on('hint:unlocked', (payload) => {
      const nextPoints = Number(payload?.points);
      if (Number.isFinite(nextPoints)) {
        setProfile((prev) => (prev ? { ...prev, points: nextPoints } : prev));
        setProfileStats((prev) => ({ ...prev, points: nextPoints }));
        setAuth((prev) => ({
          ...prev,
          user: prev.user ? { ...prev.user, points: nextPoints } : prev.user
        }));
      }

      queueToastMessage({
        type: 'success',
        message: Number(payload?.cost || 0) > 0
          ? `Hint déverrouillé sur ${payload.challengeTitle} (-${payload.cost} pts).`
          : `Hint gratuit déverrouillé sur ${payload.challengeTitle}.`
      });
    });

    socket.on('challenge:unlocked', async (payload) => {
      queueToastMessage({
        type: 'success',
        message: `Nouveau challenge débloqué : ${payload?.title || 'Challenge'}`
      });

      try {
        const challengeData = await apiRequest('/api/challenges', { token: auth.token });
        setChallenges(challengeData.challenges || challengeData.items || challengeData || []);
      } catch {
        // no-op if the API is restarting
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [auth.token, currentUserId]);

  const handleLogout = () => {
    clearStoredAuth();
    router.replace('/login');
  };

  const switchTab = (tab) => {
    setPageLoading(true);
    setActiveTab(tab);
    window.setTimeout(() => setPageLoading(false), 220);
  };

  const getResponseValue = (challenge) => {
    const challengeId = challenge?.id || challenge?._id;
    if (!challengeId) return getDefaultResponseValue(challenge);

    const stored = submissionInputs[challengeId];
    const fallback = getDefaultResponseValue(challenge);

    if (challenge?.submissionMode === 'quiz') {
      return Array.isArray(stored) ? stored : fallback;
    }

    return typeof stored === 'string' ? stored : fallback;
  };

  const handleSubmitChallenge = async (challenge) => {
    const challengeId = challenge?.id || challenge?._id;
    const isQuizMode = challenge?.submissionMode === 'quiz' && Array.isArray(challenge?.quizQuestions) && challenge.quizQuestions.length > 0;
    const currentValue = getResponseValue(challenge);

    const body = isQuizMode
      ? { answers: currentValue.map((item) => String(item || '').trim()) }
      : { flag: String(currentValue || '').trim() };

    const missing = isQuizMode
      ? body.answers.some((item) => !item) || body.answers.length !== challenge.quizQuestions.length
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
      setSubmittingChallengeId(challengeId);
      const result = await apiRequest(`/api/challenges/${challengeId}/submit`, {
        method: 'POST',
        token: auth.token,
        body
      });

      await loadAll(auth.token);
      setSubmissionInputs((prev) => ({
        ...prev,
        [challengeId]: getDefaultResponseValue(challenge)
      }));
      setSubmissionModal({
        open: true,
        variant: 'success',
        title: 'Félicitations 🎉',
        message: result.message || 'Challenge validé avec succès.'
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
      setSubmittingChallengeId(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.username || !profileForm.email) {
      setToast({ type: 'error', message: 'Nom et email sont obligatoires.' });
      return;
    }

    try {
      setPageLoading(true);
      const data = await apiRequest('/api/profile/me', {
        method: 'PATCH',
        token: auth.token,
        body: profileForm
      });

      const nextUser = data.user || data.profile || { ...auth.user, ...profileForm };
      setStoredAuth(auth.token, nextUser);
      setAuth({ token: auth.token, user: nextUser });
      await loadAll(auth.token);
      setToast({ type: 'success', message: 'Profil mis à jour.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setPageLoading(false);
    }
  };

  const categoryCounts = useMemo(() => {
    const counts = { All: challenges.length };
    for (const category of ['Web', 'Crypto', 'Reverse', 'Forensics', 'Stegano', 'OSINT', 'Pwn', 'Misc']) {
      counts[category] = challenges.filter((challenge) => challenge.type === category).length;
    }
    return counts;
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    let rows = [...challenges];

    if (filters.type !== 'All') rows = rows.filter((challenge) => challenge.type === filters.type);
    if (filters.difficulty !== 'All') rows = rows.filter((challenge) => challenge.difficulty === filters.difficulty);
    if (q) {
      rows = rows.filter((challenge) => {
        const title = String(challenge.title || '').toLowerCase();
        const desc = String(challenge.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    if (filters.sort === 'points') rows.sort((a, b) => (b.points || 0) - (a.points || 0));
    if (filters.sort === 'solves') rows.sort((a, b) => (b.solvesCount || 0) - (a.solvesCount || 0));
    if (filters.sort === 'new') rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return rows;
  }, [challenges, filters]);

  const myRow = useMemo(
    () => leaderboard.find((entry) => (entry.id || entry._id) === currentUserId),
    [leaderboard, currentUserId]
  );

  const myRank = myRow?.rank || profileStats.rank || '-';
  const stats = {
    points: profileStats.points ?? profile?.points ?? auth.user?.points ?? 0,
    solvedCount:
      profileStats.solvedChallengesCount ??
      profile?.solvedChallengesCount ??
      profile?.solvedCount ??
      profile?.solved?.length ??
      auth.user?.solvedChallengesCount ??
      0,
    firstBloods: profileStats.firstBloods ?? profile?.firstBloods ?? auth.user?.firstBloods ?? 0
  };

  if (bootLoading) {
    return (
      <div className="page">
        <div className="container">
          <div className="stack gap-xl">
            <div className="stats-grid">
              <div className="glass card"><ChallengeCardSkeleton compact /></div>
              <div className="glass card"><ChallengeCardSkeleton compact /></div>
              <div className="glass card"><ChallengeCardSkeleton compact /></div>
              <div className="glass card"><ChallengeCardSkeleton compact /></div>
            </div>
            <div className="challenge-grid">
              <ChallengeCardSkeleton />
              <ChallengeCardSkeleton />
              <ChallengeCardSkeleton />
              <ChallengeCardSkeleton />
            </div>
            <TableSkeleton rows={4} cols={6} />
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
      <LoaderOverlay show={pageLoading} label="Chargement de l'interface..." />

      <DashboardShell
        title="CyberCTF Arena"
        subtitle="Toasts live premium pendant la compétition, support intégré et interface épurée côté participant sans centre de notifications séparé."
        user={profile || auth.user}
        onLogout={handleLogout}
        topActions={
          <div className="row-wrap" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn btn-soft row row-between" onClick={() => switchTab('tickets')}>
              <span className="row" style={{ gap: 8 }}><MessageSquare size={16} /> Support</span>
              {ticketUnread > 0 ? <span className="badge badge-live">{ticketUnread}</span> : <span className="badge badge-outline-neutral">0</span>}
            </button>
          </div>
        }
        sidebar={
          <>
            <button className={`btn ${activeTab === 'challenges' ? 'btn-accent' : 'btn-soft'} row`} onClick={() => switchTab('challenges')}>
              <Flag size={16} />
              Challenges
            </button>
            <button className={`btn ${activeTab === 'leaderboard' ? 'btn-accent' : 'btn-soft'} row`} onClick={() => switchTab('leaderboard')}>
              <Trophy size={16} />
              Leaderboard
            </button>
            <button className={`btn ${activeTab === 'tickets' ? 'btn-accent' : 'btn-soft'} row row-between`} onClick={() => switchTab('tickets')}>
              <span className="row" style={{ gap: 8 }}>
                <MessageSquare size={16} />
                Tickets
              </span>
              {ticketUnread > 0 ? <span className="badge badge-live">{ticketUnread}</span> : null}
            </button>
            <button className={`btn ${activeTab === 'profile' ? 'btn-accent' : 'btn-soft'} row`} onClick={() => switchTab('profile')}>
              <User size={16} />
              Profil
            </button>
          </>
        }
      >
        {activeTab === 'challenges' && (
          <div className="stack gap-xl">
            <div className="hero-panel glass">
              <div className="hero-orb hero-orb-left" />
              <div className="hero-orb hero-orb-right" />
              <div className="hero-panel-grid">
                <div>
                  <div className="eyebrow">Compétition</div>
                  <h2 className="title-lg" style={{ marginTop: 6 }}>Choisis ta catégorie et résous proprement</h2>
                  <p className="text-muted hero-copy">
                    Navigation par onglets, tri par points/solves, page dédiée par challenge, téléchargements rapides et défis qui se débloquent après résolution des prérequis.
                  </p>
                  <div className="hero-bonus-strip">
                    <span className="badge badge-bonus">+80 premier solve</span>
                    <span className="badge badge-outline-green">+50 deuxième solve</span>
                    <span className="badge badge-outline-neutral">Quiz multi-questions sur OSINT</span>
                  </div>
                  <p className="text-muted hero-copy">
                    Les défis validés par les autres joueurs remontent maintenant en direct via WebSocket, avec toast instantané premium et son discret.
                  </p>
                </div>
                <div className="stats-grid compact-stats">
                  <StatCard label="Mes points" value={stats.points} accent="green" />
                  <StatCard label="Mes résolus" value={stats.solvedCount} accent="pink" />
                  <StatCard label="First blood" value={stats.firstBloods} accent="gold" />
                  <StatCard label="Mon rang" value={`#${myRank}`} accent="pink" />
                </div>
              </div>
            </div>

            <CategoryTabs
              value={filters.type}
              counts={categoryCounts}
              onChange={(type) => setFilters((prev) => ({ ...prev, type }))}
            />

            <div className="glass card control-bar">
              <div className="search-wrap">
                <Search size={16} />
                <input
                  className="input input-ghost"
                  placeholder="Rechercher un challenge (titre / description)"
                  value={filters.q}
                  onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                />
              </div>

              <div className="row-wrap controls-right">
                <select
                  className="select"
                  value={filters.difficulty}
                  onChange={(event) => setFilters((prev) => ({ ...prev, difficulty: event.target.value }))}
                >
                  {['All', 'Easy', 'Medium', 'Hard', 'Insane'].map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <select
                  className="select"
                  value={filters.sort}
                  onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value }))}
                >
                  <option value="new">Plus récents</option>
                  <option value="points">Plus de points</option>
                  <option value="solves">Plus résolus</option>
                </select>
              </div>
            </div>

            <div className="section-headline row-between">
              <div>
                <div className="eyebrow">Catégorie active</div>
                <h3 className="title-md">{filters.type === 'All' ? 'Tous les challenges' : filters.type}</h3>
              </div>
              <div className="text-muted">{filteredChallenges.length} challenge(s)</div>
            </div>

            <div className="challenge-grid challenge-grid-fill">
              {filteredChallenges.length === 0 ? (
                <div className="glass empty-box">Aucun challenge pour ce filtre.</div>
              ) : (
                filteredChallenges.map((challenge) => {
                  const challengeId = challenge.id || challenge._id;
                  const solved = Boolean(challenge.solvedByMe);
                  const firstBloodUserId = challenge.firstBloodUser?._id || challenge.firstBloodUser?.id || challenge.firstBloodUser;
                  const isFirstBlood = Boolean(firstBloodUserId && firstBloodUserId === currentUserId);
                  const responseValue = getResponseValue(challenge);

                  return (
                    <ChallengeCard
                      key={challengeId}
                      challenge={challenge}
                      solved={solved}
                      isFirstBlood={isFirstBlood}
                      responseValue={responseValue}
                      onTextChange={(value) => setSubmissionInputs((prev) => ({ ...prev, [challengeId]: value }))}
                      onQuizAnswerChange={(questionIndex, value) => {
                        const currentAnswers = Array.isArray(getResponseValue(challenge))
                          ? [...getResponseValue(challenge)]
                          : getDefaultResponseValue(challenge);
                        currentAnswers[questionIndex] = value;
                        setSubmissionInputs((prev) => ({ ...prev, [challengeId]: currentAnswers }));
                      }}
                      onSubmit={() => handleSubmitChallenge(challenge)}
                      submitting={submittingChallengeId === challengeId}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="stack gap-xl">
            <div className="stats-grid">
              <StatCard label="Mon rang" value={`#${myRank}`} accent="pink" />
              <StatCard label="Mes points" value={stats.points} accent="green" />
              <StatCard label="Mes first blood" value={stats.firstBloods} accent="gold" />
              <StatCard label="Mes résolus" value={stats.solvedCount} accent="pink" />
            </div>
            <LeaderboardTable rows={leaderboard} currentUserId={currentUserId} />
          </div>
        )}


        {activeTab === 'tickets' && (
          <TicketsPanel
            token={auth.token}
            refreshSignal={ticketsRefreshSignal}
            onUnreadChange={setTicketUnread}
          />
        )}

        {activeTab === 'profile' && (
          <div className="split-grid">
            <div className="glass card profile-panel">
              <div className="eyebrow">Compte</div>
              <h2 className="panel-title title-md">Modifier mon profil</h2>
              <div className="stack">
                <input
                  className="input"
                  placeholder="Nom d'utilisateur"
                  value={profileForm.username}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, username: event.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <textarea
                  className="textarea"
                  placeholder="Bio"
                  value={profileForm.bio}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                />
                <button className="btn btn-accent" onClick={handleSaveProfile}>
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="stack gap-xl">
              <div className="stats-grid">
                <StatCard label="Points" value={stats.points} accent="green" />
                <StatCard label="Résolus" value={stats.solvedCount} accent="pink" />
                <StatCard label="First Blood" value={stats.firstBloods} accent="gold" />
                <StatCard label="Rang" value={`#${myRank}`} accent="pink" />
              </div>

              <div className="glass card">
                <div className="eyebrow">Progression</div>
                <h2 className="panel-title title-md">Mes stats</h2>
                <div className="stack">
                  <div className="notice notice-subtle">Challenges résolus : <strong>{stats.solvedCount}</strong></div>
                  <div className="notice notice-success">Statut first blood : <strong>{stats.firstBloods > 0 ? 'Oui' : 'Pas encore'}</strong></div>
                  <div className="notice notice-subtle">Position actuelle : <strong>#{myRank}</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
