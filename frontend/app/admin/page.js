"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BellRing,
  Flag,
  Lock,
  Pencil,
  Plus,
  RefreshCcw,
  Shield,
  Trash2,
  Trophy,
  User,
  MessageSquare,
  X
} from 'lucide-react';
import AdminChallengeForm from '@/components/AdminChallengeForm';
import AdminTicketsPanel from '@/components/AdminTicketsPanel';
import ChallengeCardSkeleton from '@/components/ChallengeCardSkeleton';
import DashboardShell from '@/components/DashboardShell';
import CountUpNumber from '@/components/CountUpNumber';
import LiveFeedPanel from '@/components/LiveFeedPanel';
import LoaderOverlay from '@/components/LoaderOverlay';
import NotificationCenter from '@/components/NotificationCenter';
import TableSkeleton from '@/components/TableSkeleton';
import Toast from '@/components/Toast';
import { apiRequest } from '@/lib/api';
import { clearStoredAuth, getStoredAuth, isAdminUser, setStoredAuth } from '@/lib/auth';
import { createRealtimeClient } from '@/lib/realtime';

function StatCard({ label, value, tone = 'green' }) {
  return (
    <motion.div
      className={`glass stat-card stat-card-${tone} stat-card-pro`}
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

function typeClass(type) {
  return `badge badge-type-${String(type || 'misc').toLowerCase()}`;
}

function difficultyClass(level) {
  return `badge badge-${String(level || 'easy').toLowerCase()}`;
}

function prependUnique(items, nextItem, limit = 40) {
  if (!nextItem?.id) return items;
  const filtered = items.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...filtered].slice(0, limit);
}

function buildSolveNotification(event, unread = false) {
  return {
    id: `notif:${event.id}`,
    kind: 'solve',
    title: `${event.actorName || 'Participant'} a validé ${event.challengeTitle || 'un challenge'}`,
    message: `${event.challengeType || 'Challenge'} • +${event.totalAwarded || 0} pts${event.firstBlood ? ' • First Blood' : event.solveOrder ? ` • #${event.solveOrder}` : ''}`,
    timestamp: event.submittedAt || new Date().toISOString(),
    unread,
    tone: event.firstBlood ? 'gold' : 'pink'
  };
}

function buildTicketNotification(payload, unread = false) {
  return {
    id: `notif:${payload.id || `ticket-${Date.now()}`}`,
    kind: 'ticket',
    title: payload.subject ? `Support • ${payload.subject}` : 'Nouveau ticket',
    message: payload.preview || payload.message || 'Activité sur les tickets support.',
    timestamp: payload.createdAt || new Date().toISOString(),
    unread,
    tone: 'green'
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('challenges');
  const activeTabRef = useRef('challenges');
  const [bootLoading, setBootLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [auth, setAuth] = useState({ token: null, user: null });
  const [profileForm, setProfileForm] = useState({ username: '', email: '', bio: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [challenges, setChallenges] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [challengeUploadProgress, setChallengeUploadProgress] = useState(0);
  const [editingUsers, setEditingUsers] = useState({});
  const [ticketCount, setTicketCount] = useState(0);
  const [ticketsRefreshSignal, setTicketsRefreshSignal] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const seenActivityIdsRef = useRef(new Set());

  const appendNotification = (entry, markUnread = false) => {
    setNotifications((prev) => prependUnique(prev, { ...entry, unread: markUnread || entry.unread }, 60));
    if (markUnread) {
      setNotificationUnread((prev) => Math.min(prev + 1, 99));
    }
  };

  const pushLiveEvent = (event) => {
    setLiveFeed((prev) => prependUnique(prev, event, 16));
  };

  const markNotificationsRead = () => {
    setNotificationUnread(0);
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const loadAdminData = async (token) => {
    const [challengeData, userData, ticketData, activityData] = await Promise.all([
      apiRequest('/api/admin/challenges', { token }),
      apiRequest('/api/admin/users', { token }),
      apiRequest('/api/admin/tickets', { token }),
      apiRequest('/api/challenges/activity/feed?limit=12', { token })
    ]);

    const challengeRows = challengeData.challenges || challengeData.items || challengeData || [];
    const userRows = userData.users || userData.items || userData || [];
    const ticketRows = ticketData?.tickets || [];
    const activityRows = Array.isArray(activityData?.events) ? activityData.events : [];

    setChallenges(challengeRows);
    setUsers(userRows);
    setTicketCount(ticketRows.filter((t) => t.status !== 'closed').length);
    seenActivityIdsRef.current = new Set(activityRows.map((event) => event.id));
    setLiveFeed(activityRows);
    setNotifications(activityRows.map((event) => buildSolveNotification(event, false)));
    setNotificationUnread(0);
  };

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

      if (!isAdminUser(stored.user)) {
        router.replace('/dashboard');
        return;
      }

      setAuth(stored);
      setProfileForm({
        username: stored.user?.username || '',
        email: stored.user?.email || '',
        bio: stored.user?.bio || ''
      });

      try {
        await loadAdminData(stored.token);
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
      if (seenActivityIdsRef.current.has(event.id)) return;
      seenActivityIdsRef.current.add(event.id);
      pushLiveEvent(event);
      const shouldMarkUnread = activeTabRef.current !== 'notifications';
      appendNotification(buildSolveNotification(event, shouldMarkUnread), shouldMarkUnread);
      setToast({
        type: event.firstBlood ? 'success' : 'info',
        message: `${event.actorName} a résolu « ${event.challengeTitle} » • +${event.totalAwarded} pts${event.firstBlood ? ' • First Blood' : ''}`
      });
    });

    socket.on('ticket:new', (payload) => {
      setTicketsRefreshSignal((prev) => prev + 1);
      setTicketCount((prev) => prev + 1);
      const shouldMarkUnread = activeTabRef.current !== 'notifications';
      appendNotification(buildTicketNotification(payload, shouldMarkUnread), shouldMarkUnread);
      setToast({
        type: 'info',
        message: payload?.participantName
          ? `Nouveau ticket de @${payload.participantName}.`
          : 'Nouveau ticket ouvert.'
      });
    });

    socket.on('ticket:participant-reply', (payload) => {
      setTicketsRefreshSignal((prev) => prev + 1);
      const shouldMarkUnread = activeTabRef.current !== 'notifications';
      appendNotification(buildTicketNotification(payload, shouldMarkUnread), shouldMarkUnread);
      setToast({
        type: 'info',
        message: payload?.participantName
          ? `Nouvelle réponse de @${payload.participantName}.`
          : 'Nouvelle réponse sur un ticket.'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [auth.token]);

  const handleLogout = () => {
    clearStoredAuth();
    router.replace('/login');
  };

  const switchTab = (tab) => {
    setPageLoading(true);
    setActiveTab(tab);
    if (tab === 'notifications') {
      markNotificationsRead();
    }
    window.setTimeout(() => setPageLoading(false), 260);
  };

  const openCreateChallengeModal = () => {
    setEditingChallenge(null);
    setActiveTab('challenges');
    setIsChallengeModalOpen(true);
  };

  const openEditChallengeModal = (challenge) => {
    setEditingChallenge(challenge);
    setActiveTab('challenges');
    setIsChallengeModalOpen(true);
  };

  const closeChallengeModal = () => {
    if (challengeSubmitting) return;
    setEditingChallenge(null);
    setChallengeUploadProgress(0);
    setIsChallengeModalOpen(false);
  };

  const handleSubmitChallenge = async (formData) => {
    try {
      setChallengeSubmitting(true);
      setChallengeUploadProgress(0);

      const uploadOptions = {
        token: auth.token,
        body: formData,
        isFormData: true,
        onUploadProgress: ({ percent }) => {
          setChallengeUploadProgress(percent || 0);
        }
      };

      if (editingChallenge) {
        const challengeId = editingChallenge._id || editingChallenge.id;
        await apiRequest(`/api/admin/challenges/${challengeId}`, {
          method: 'PATCH',
          ...uploadOptions
        });
        setToast({ type: 'success', message: 'Challenge modifié.' });
      } else {
        await apiRequest('/api/admin/challenges', {
          method: 'POST',
          ...uploadOptions
        });
        setToast({ type: 'success', message: 'Challenge créé.' });
      }

      setChallengeUploadProgress(100);
      closeChallengeModal();
      setPageLoading(true);
      await loadAdminData(auth.token);
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setChallengeSubmitting(false);
      setChallengeUploadProgress(0);
      setPageLoading(false);
    }
  };

  const handleDeleteChallenge = async (challengeId) => {
    try {
      setPageLoading(true);
      const data = await apiRequest(`/api/admin/challenges/${challengeId}`, {
        method: 'DELETE',
        token: auth.token
      });
      if ((editingChallenge?._id || editingChallenge?.id) === challengeId) {
        closeChallengeModal();
      }
      await loadAdminData(auth.token);
      setToast({ type: 'success', message: data.message || 'Challenge supprimé.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setPageLoading(false);
    }
  };

  const handleUserFieldChange = (userId, field, value) => {
    setEditingUsers((prev) => ({
      ...prev,
      [userId]: {
        username: prev[userId]?.username ?? users.find((u) => (u._id || u.id) === userId)?.username ?? '',
        email: prev[userId]?.email ?? users.find((u) => (u._id || u.id) === userId)?.email ?? '',
        role: prev[userId]?.role ?? users.find((u) => (u._id || u.id) === userId)?.role ?? 'participant',
        bio: prev[userId]?.bio ?? users.find((u) => (u._id || u.id) === userId)?.bio ?? '',
        [field]: value
      }
    }));
  };

  const handleSaveUser = async (userId) => {
    const draft = editingUsers[userId];
    if (!draft) return;

    try {
      setPageLoading(true);
      await apiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        token: auth.token,
        body: draft
      });
      await loadAdminData(auth.token);
      setToast({ type: 'success', message: 'Utilisateur mis à jour.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setPageLoading(false);
    }
  };

  const handleSaveMyProfile = async () => {
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

      const nextUser = data.user || { ...auth.user, ...profileForm };
      setStoredAuth(auth.token, nextUser);
      setAuth((prev) => ({ ...prev, user: nextUser }));
      setUsers((prev) => prev.map((user) => (
        (user._id || user.id) === (nextUser.id || nextUser._id)
          ? { ...user, ...nextUser }
          : user
      )));
      setToast({ type: 'success', message: 'Compte admin mis à jour.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setPageLoading(false);
    }
  };

  const handleChangeMyPassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setToast({ type: 'error', message: 'Remplis les trois champs du mot de passe.' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ type: 'error', message: 'La confirmation du nouveau mot de passe ne correspond pas.' });
      return;
    }

    try {
      setPageLoading(true);
      const data = await apiRequest('/api/profile/me/password', {
        method: 'PATCH',
        token: auth.token,
        body: passwordForm
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setToast({ type: 'success', message: data.message || 'Mot de passe admin mis à jour.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setPageLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if ((auth.user?._id || auth.user?.id) === userId) {
      setToast({ type: 'error', message: 'Tu ne peux pas supprimer ton propre compte connecté.' });
      return;
    }

    try {
      setPageLoading(true);
      const data = await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        token: auth.token
      });
      await loadAdminData(auth.token);
      setToast({ type: 'success', message: data.message || 'Utilisateur supprimé.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setPageLoading(false);
    }
  };

  const handleRecalculateScores = async () => {
    try {
      setPageLoading(true);
      const data = await apiRequest('/api/admin/maintenance/recalculate-scores', {
        method: 'POST',
        token: auth.token
      });
      await loadAdminData(auth.token);
      setToast({ type: 'success', message: data.message || 'Scores recalculés.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setPageLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalSolves = challenges.reduce((sum, challenge) => (
      sum + (challenge.solveCount ?? challenge.solves?.length ?? 0)
    ), 0);

    return {
      challenges: challenges.length,
      participants: users.filter((user) => user.role === 'participant').length,
      admins: users.filter((user) => user.role === 'admin').length,
      solves: totalSolves
    };
  }, [challenges, users]);

  if (bootLoading) {
    return (
      <div className="page">
        <div className="container">
          <div className="stack gap-xl">
            <div className="stats-grid">
              <div className="glass card"><ChallengeCardSkeleton compact /></div>
              <div className="glass card"><ChallengeCardSkeleton compact /></div>
              <div className="glass card"><ChallengeCardSkeleton compact /></div>
            </div>
            <div className="split-grid">
              <div className="glass card">
                <ChallengeCardSkeleton />
              </div>
              <div className="stack">
                <ChallengeCardSkeleton />
                <ChallengeCardSkeleton />
              </div>
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
      <LoaderOverlay show={pageLoading} label="Mise à jour..." />

      {isChallengeModalOpen && (
        <div className="modal-backdrop" onClick={closeChallengeModal}>
          <div className="modal admin-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-body">
              <button
                className="btn btn-soft btn-icon admin-modal-close"
                onClick={closeChallengeModal}
                disabled={challengeSubmitting}
                aria-label="Fermer la fenêtre de challenge"
                title="Fermer"
              >
                <X size={16} />
              </button>

              <AdminChallengeForm
                editingChallenge={editingChallenge}
                availableChallenges={challenges}
                onSubmit={handleSubmitChallenge}
                onCancel={closeChallengeModal}
                loading={challengeSubmitting}
                uploadProgress={challengeUploadProgress}
                className="admin-form-card-modal"
                showNotice={false}
              />
            </div>
          </div>
        </div>
      )}

      <DashboardShell
        title="Plateforme CTF Admin"
        subtitle="Mission control premium avec WebSocket, feed live et centre de notifications pour suivre tickets + résolutions sans recharger la page."
        user={auth.user}
        onLogout={handleLogout}
        topActions={
          <div className="row-wrap" style={{ gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-soft row row-between" onClick={() => switchTab('notifications')}>
              <span className="row" style={{ gap: 8 }}><BellRing size={16} /> Live</span>
              {notificationUnread > 0 ? <span className="badge badge-live">{notificationUnread}</span> : <span className="badge badge-outline-neutral">0</span>}
            </button>
            <button className="btn btn-soft row row-between" onClick={() => switchTab('tickets')}>
              <span className="row" style={{ gap: 8 }}><MessageSquare size={16} /> Support</span>
              {ticketCount > 0 ? <span className="badge badge-live">{ticketCount}</span> : <span className="badge badge-outline-neutral">0</span>}
            </button>
          </div>
        }
        sidebar={
          <>
            <button className={`btn ${activeTab === 'challenges' ? 'btn-primary' : 'btn-soft'} row`} onClick={() => switchTab('challenges')}>
              <Flag size={16} />
              Challenges
            </button>
            <button className="btn btn-primary row nav-create-btn" onClick={openCreateChallengeModal}>
              <Plus size={16} />
              Créer un challenge
            </button>
            <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-soft'} row`} onClick={() => switchTab('users')}>
              <User size={16} />
              Participants
            </button>
            <button className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-soft'} row row-between`} onClick={() => switchTab('notifications')}>
              <span className="row" style={{ gap: 8 }}>
                <BellRing size={16} />
                Notifications
              </span>
              {notificationUnread > 0 ? <span className="badge badge-live">{notificationUnread}</span> : null}
            </button>
            <button className={`btn ${activeTab === 'tickets' ? 'btn-primary' : 'btn-soft'} row row-between`} onClick={() => switchTab('tickets')}>
              <span className="row" style={{ gap: 8 }}>
                <MessageSquare size={16} />
                Tickets
              </span>
              {ticketCount > 0 ? <span className="badge badge-live">{ticketCount}</span> : null}
            </button>
            <button className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-soft'} row`} onClick={() => switchTab('stats')}>
              <Trophy size={16} />
              Vue d'ensemble
            </button>
            <button className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-soft'} row`} onClick={() => switchTab('profile')}>
              <Shield size={16} />
              Mon compte
            </button>
            <button className="btn btn-outline-accent row" onClick={handleRecalculateScores}>
              <RefreshCcw size={16} />
              Recalculer les scores
            </button>
          </>
        }
      >
        {activeTab === 'challenges' && (
          <div className="stack gap-xl">
            <div className="glass section-intro-card">
              <div className="challenge-admin-head">
                <div>
                  <div className="eyebrow">Layout optimisé</div>
                  <h2 className="title-md">Challenges étirés + supervision live</h2>
                  <div className="text-muted">La grille admin reste dense, et un feed temps réel te montre maintenant les dernières validations dès qu’elles arrivent.</div>
                </div>
                <div className="challenge-admin-toolbar">
                  <span className="badge badge-outline-neutral">{challenges.length} challenge(s)</span>
                  <span className="badge badge-outline-green">WebSocket actif</span>
                </div>
              </div>
            </div>

            <LiveFeedPanel
              items={liveFeed}
              title="Feed live admin"
              subtitle="Résolutions reçues en direct depuis tous les participants."
            />

            <div className="challenge-admin-grid">
              {challenges.map((challenge) => {
                const challengeId = challenge._id || challenge.id;
                return (
                  <div key={challengeId} className="glass challenge-card challenge-card-wow challenge-admin-card">
                    <div className="challenge-sheen" />

                    <div className="stack challenge-admin-card-stack">
                      <div className="challenge-admin-card-head">
                        <div className="challenge-admin-title-wrap">
                          <h3 className="title-md challenge-admin-title">{challenge.title}</h3>
                          <div className="row-wrap challenge-admin-badges">
                            <span className={typeClass(challenge.type)}>{challenge.type}</span>
                            <span className={difficultyClass(challenge.difficulty)}>{challenge.difficulty}</span>
                          </div>
                        </div>

                        <div className="challenge-admin-actions" aria-label={`Actions pour ${challenge.title}`}>
                          <button
                            className="btn btn-soft btn-icon"
                            onClick={() => openEditChallengeModal(challenge)}
                            title="Modifier"
                            aria-label={`Modifier ${challenge.title}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn btn-danger btn-icon"
                            onClick={() => handleDeleteChallenge(challengeId)}
                            title="Supprimer"
                            aria-label={`Supprimer ${challenge.title}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="text-muted clamp-2">{challenge.description}</div>

                      <div className="row-wrap">
                        <span className="file-chip file-chip-hot">{challenge.points} pts</span>
                        <span className="file-chip">{challenge.solveCount ?? challenge.solves?.length ?? 0} solve(s)</span>
                        <span className="file-chip file-chip-soft">1er +80 / 2e +50</span>
                        {challenge.isSuspendedUntilPrerequisite && challenge.prerequisiteChallenge && (
                          <span className="file-chip file-chip-locked">
                            <Lock size={13} />
                            Suspendu jusqu’à {challenge.prerequisiteChallenge.title}
                          </span>
                        )}
                      </div>

                      {challenge.isSuspendedUntilPrerequisite && challenge.prerequisiteChallenge && (
                        <div className="notice notice-subtle challenge-admin-lock-note">
                          Ce challenge reste masqué côté participants tant que <strong>{challenge.prerequisiteChallenge.title}</strong> n’est pas résolu.
                        </div>
                      )}

                      {!!challenge.files?.length && (
                        <div className="row-wrap">
                          {challenge.files.map((file) => (
                            <span key={file._id || file.filename || file.name || file} className="file-chip">
                              {file.originalName || file.name || file.filename || file}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {challenges.length === 0 && (
                <div className="glass empty-box empty-box-wide">Aucun challenge créé.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="stack gap-xl">
            <NotificationCenter
              items={notifications}
              onMarkRead={markNotificationsRead}
              subtitle="Résolutions live et activité support remontées instantanément aux admins."
            />
            <LiveFeedPanel
              items={liveFeed}
              title="Résolutions en direct"
              subtitle="Historique court des dernières validations reçues par le back-office."
            />
          </div>
        )}

        {activeTab === 'tickets' && (
          <AdminTicketsPanel
            token={auth.token}
            refreshSignal={ticketsRefreshSignal}
            onTicketCountChange={setTicketCount}
          />
        )}

        {activeTab === 'users' && (
          users.length === 0 ? (
            <TableSkeleton rows={4} cols={6} />
          ) : (
            <div className="glass card table-wrap">
              <div className="row-between" style={{ marginBottom: 12 }}>
                <h2 className="panel-title title-md">Gestion des utilisateurs</h2>
                <span className="badge badge-outline-neutral"><Shield size={12} /> {users.length} compte(s)</span>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Points</th>
                    <th>First Blood</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const userId = user._id || user.id;
                    const draft = editingUsers[userId] || user;

                    return (
                      <tr key={userId}>
                        <td>
                          <input
                            className="input"
                            style={{ minWidth: 150 }}
                            value={draft.username || ''}
                            onChange={(event) => handleUserFieldChange(userId, 'username', event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ minWidth: 220 }}
                            value={draft.email || ''}
                            onChange={(event) => handleUserFieldChange(userId, 'email', event.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="select"
                            value={draft.role || 'participant'}
                            onChange={(event) => handleUserFieldChange(userId, 'role', event.target.value)}
                          >
                            <option value="participant">participant</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td>{user.points ?? 0}</td>
                        <td>{user.firstBloods ?? 0}</td>
                        <td>
                          <div className="row">
                            <button className="btn btn-success" onClick={() => handleSaveUser(userId)}>
                              Enregistrer
                            </button>
                            <button className="btn btn-danger" onClick={() => handleDeleteUser(userId)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'profile' && (
          <div className="split-grid">
            <div className="glass card profile-panel">
              <div className="eyebrow">Admin</div>
              <h2 className="panel-title title-md">Modifier mon compte</h2>
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
                <button className="btn btn-primary" onClick={handleSaveMyProfile}>
                  Enregistrer mes informations
                </button>
              </div>
            </div>

            <div className="stack gap-xl">
              <div className="glass card profile-panel">
                <div className="eyebrow">Sécurité</div>
                <h2 className="panel-title title-md">Changer mon mot de passe</h2>
                <div className="stack">
                  <input
                    className="input"
                    type="password"
                    placeholder="Mot de passe actuel"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Nouveau mot de passe"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Confirmer le nouveau mot de passe"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  />
                  <button className="btn btn-outline-accent" onClick={handleChangeMyPassword}>
                    Mettre à jour le mot de passe
                  </button>
                </div>
              </div>

              <div className="stats-grid">
                <StatCard label="Challenges" value={stats.challenges} tone="pink" />
                <StatCard label="Participants" value={stats.participants} tone="green" />
                <StatCard label="Admins" value={stats.admins} tone="gold" />
                <StatCard label="Solves" value={stats.solves} tone="pink" />
              </div>

              <div className="glass card">
                <div className="eyebrow">Persistance des données</div>
                <h2 className="panel-title title-md">Challenges existants</h2>
                <div className="stack">
                  <div className="notice notice-subtle">
                    Les challenges déjà créés sont stockés dans MongoDB, pas dans le frontend. Si tu lances une nouvelle version sur une autre base ou un autre volume Docker, la liste devient vide.
                  </div>
                  <div className="notice notice-success">
                    Cette version utilise maintenant un volume Mongo nommé de façon fixe pour éviter de perdre les challenges quand tu changes juste de dossier ou de version.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stack gap-xl">
            <div className="row-between row-wrap">
              <div className="stats-grid" style={{ flex: 1 }}>
                <StatCard label="Challenges" value={stats.challenges} tone="pink" />
                <StatCard label="Participants" value={stats.participants} tone="green" />
                <StatCard label="Admins" value={stats.admins} tone="gold" />
                <StatCard label="Solves totaux" value={stats.solves} tone="pink" />
              </div>
              <button className="btn btn-outline-accent row" onClick={handleRecalculateScores}>
                <RefreshCcw size={16} />
                Recalcul global
              </button>
            </div>

            <div className="split-grid split-grid-top">
              <div className="glass card">
                <h2 className="panel-title title-md">Challenges les plus résolus</h2>
                <div className="stack">
                  {[...challenges]
                    .sort((a, b) => (b.solveCount ?? b.solves?.length ?? 0) - (a.solveCount ?? a.solves?.length ?? 0))
                    .slice(0, 8)
                    .map((challenge) => (
                      <div key={challenge._id || challenge.id} className="notice">
                        <strong>{challenge.title}</strong> — {challenge.solveCount ?? challenge.solves?.length ?? 0} solve(s)
                      </div>
                    ))}

                  {challenges.length === 0 && (
                    <div className="notice">Aucune donnée pour le moment.</div>
                  )}
                </div>
              </div>

              <LiveFeedPanel
                items={liveFeed}
                title="Feed live"
                subtitle="Vue rapide des dernières validations depuis le tableau de bord admin."
              />
            </div>
          </div>
        )}
      </DashboardShell>
    </>
  );
}
