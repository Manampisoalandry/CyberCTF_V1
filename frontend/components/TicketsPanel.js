"use client";

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Plus, Send, Ticket, X } from 'lucide-react';
import LoaderOverlay from '@/components/LoaderOverlay';
import Toast from '@/components/Toast';
import { apiRequest } from '@/lib/api';

function formatDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return '';
  }
}

function TicketBadge({ status }) {
  return (
    <span className={`badge ${status === 'closed' ? 'badge-outline-neutral' : 'badge-outline-green'}`}>
      {status === 'closed' ? 'Fermé' : 'Ouvert'}
    </span>
  );
}

export default function TicketsPanel({ token, refreshSignal = 0, onUnreadChange }) {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ subject: '', content: '' });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const activeTicket = useMemo(
    () => tickets.find((t) => (t?._id || t?.id) === activeId) || null,
    [tickets, activeId]
  );

  const loadTickets = async () => {
    const data = await apiRequest('/api/tickets', { token });
    const rows = data.tickets || [];
    setTickets(rows);
    const unreadTotal = rows.reduce((acc, t) => acc + (Array.isArray(t.messages) ? t.messages.filter((m) => m.senderRole === 'admin' && m.unreadForParticipant).length : 0), 0);
    if (typeof onUnreadChange === 'function') onUnreadChange(unreadTotal);
    if (!activeId && rows.length) setActiveId(rows[0]._id || rows[0].id);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setLoading(true);
        await loadTickets();
      } catch (error) {
        if (mounted) setToast({ type: 'error', message: error.message });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!refreshSignal) return;
    loadTickets().catch(() => {});
  }, [refreshSignal]);

  useEffect(() => {
    if (!token) return undefined;

    const timer = window.setInterval(() => {
      loadTickets().catch(() => {});
    }, 8000);

    return () => window.clearInterval(timer);
  }, [token, activeId]);

  const markRead = async (ticketId) => {
    try {
      await apiRequest(`/api/tickets/${ticketId}/mark-read`, { method: 'PATCH', token });
    } catch {
      // silent
    }
  };

  const openTicket = async (ticket) => {
    const id = ticket?._id || ticket?.id;
    setActiveId(id);
    await markRead(id);
    await loadTickets();
  };

  const createTicket = async () => {
    if (!compose.subject.trim() || !compose.content.trim()) {
      setToast({ type: 'error', message: 'Sujet et message sont obligatoires.' });
      return;
    }

    try {
      setBusy(true);
      const data = await apiRequest('/api/tickets', {
        method: 'POST',
        token,
        body: { subject: compose.subject.trim(), content: compose.content.trim() }
      });
      setCompose({ subject: '', content: '' });
      setComposeOpen(false);
      setToast({ type: 'success', message: data.message || 'Ticket envoyé.' });
      await loadTickets();
      const newId = data.ticket?._id || data.ticket?.id;
      if (newId) setActiveId(newId);
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!activeTicket) return;
    if (!reply.trim()) {
      setToast({ type: 'error', message: 'Écris un message avant d’envoyer.' });
      return;
    }

    try {
      setBusy(true);
      await apiRequest(`/api/tickets/${activeTicket._id || activeTicket.id}/reply`, {
        method: 'POST',
        token,
        body: { content: reply.trim() }
      });
      setReply('');
      await loadTickets();
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="glass card" style={{ padding: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">Support</div>
            <h2 className="title-md">Tickets</h2>
          </div>
        </div>
        <div className="skeleton" style={{ height: 14, marginTop: 18 }} />
        <div className="skeleton" style={{ height: 14, marginTop: 10, width: '70%' }} />
        <div className="skeleton" style={{ height: 160, marginTop: 16 }} />
      </div>
    );
  }

  return (
    <div className="grid-2" style={{ gap: 16 }}>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {busy && <LoaderOverlay label="Envoi..." />}

      <section className="glass card" style={{ padding: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="eyebrow">Support</div>
            <h2 className="title-md" style={{ marginTop: 6 }}>Tickets</h2>
          </div>
          <button className="btn btn-accent" onClick={() => setComposeOpen(true)}>
            <Plus size={16} />
            Nouveau
          </button>
        </div>

        <div className="stack premium-scroll" style={{ marginTop: 14, maxHeight: 520, paddingRight: 6 }}>
          {(tickets || []).length === 0 && (
            <div className="text-muted" style={{ padding: 12 }}>
              Aucun ticket pour le moment.
            </div>
          )}

          {(tickets || []).map((t) => {
            const id = t?._id || t?.id;
            const isActive = id === activeId;
            const messages = Array.isArray(t.messages) ? t.messages : [];
            const unread = messages.filter((m) => m.senderRole === 'admin' && m.unreadForParticipant).length;

            return (
              <button
                key={id}
                className={`ticket-item ${isActive ? 'ticket-item-active' : ''}`}
                onClick={() => openTicket(t)}
              >
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                    <span className="ticket-icon"><Ticket size={16} /></span>
                    <div className="ticket-title">
                      <div className="ticket-subject">{t.subject}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{formatDate(t.updatedAt || t.createdAt)}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <TicketBadge status={t.status} />
                    {unread > 0 && <span className="badge badge-pink">{unread}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass card" style={{ padding: 18, minHeight: 420 }}>
        {!activeTicket ? (
          <div className="text-muted" style={{ padding: 12 }}>Sélectionne un ticket.</div>
        ) : (
          <>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="eyebrow">Conversation</div>
                <h2 className="title-md" style={{ marginTop: 6 }}>{activeTicket.subject}</h2>
              </div>
              <TicketBadge status={activeTicket.status} />
            </div>

            <div className="ticket-thread premium-scroll" style={{ marginTop: 14, maxHeight: 520, paddingRight: 6 }}>
              {(activeTicket.messages || []).map((m) => (
                <div key={m._id} className={`ticket-bubble ${m.senderRole === 'admin' ? 'ticket-bubble-admin' : 'ticket-bubble-user'}`}>
                  <div className="ticket-bubble-meta">
                    <MessageCircle size={14} />
                    <span>{m.senderRole === 'admin' ? 'Admin' : 'Moi'}</span>
                    <span className="text-muted">• {formatDate(m.createdAt)}</span>
                  </div>
                  <div className="ticket-bubble-content">{m.content}</div>
                </div>
              ))}
            </div>

            {activeTicket.status !== 'closed' && (
              <div className="row" style={{ gap: 10, marginTop: 14, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Répondre</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Explique ton problème..."
                  />
                </div>
                <button className="btn btn-outline-accent" onClick={sendReply}>
                  <Send size={16} />
                  Envoyer
                </button>
              </div>
            )}

            {activeTicket.status === 'closed' && (
              <div className="text-muted" style={{ marginTop: 14 }}>Ce ticket est fermé.</div>
            )}
          </>
        )}
      </section>

      {composeOpen && (
        <div className="modal-backdrop" onClick={() => setComposeOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="title-md">Nouveau ticket</h3>
              <button className="icon-btn" onClick={() => setComposeOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <label className="input-label">Sujet</label>
              <input
                className="input"
                value={compose.subject}
                onChange={(e) => setCompose((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Ex: Je n'arrive pas à télécharger le fichier"
              />

              <label className="input-label" style={{ marginTop: 12 }}>Message</label>
              <textarea
                className="input"
                rows={5}
                value={compose.content}
                onChange={(e) => setCompose((p) => ({ ...p, content: e.target.value }))}
                placeholder="Décris le souci (capture, erreur, etc.)"
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setComposeOpen(false)}>Annuler</button>
              <button className="btn btn-accent" onClick={createTicket}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
