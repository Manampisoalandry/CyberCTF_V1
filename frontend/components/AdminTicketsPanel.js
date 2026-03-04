"use client";

import { useEffect, useMemo, useState } from 'react';
import { Inbox, Send, Shield, X } from 'lucide-react';
import LoaderOverlay from '@/components/LoaderOverlay';
import Toast from '@/components/Toast';
import { apiRequest } from '@/lib/api';

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export default function AdminTicketsPanel({ token, refreshSignal = 0, onTicketCountChange }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [reply, setReply] = useState('');

  const activeTicket = useMemo(
    () => tickets.find((t) => (t?._id || t?.id) === activeId) || null,
    [tickets, activeId]
  );

  const loadTickets = async () => {
    const data = await apiRequest('/api/admin/tickets', { token });
    const rows = data.tickets || [];
    setTickets(rows);
    if (typeof onTicketCountChange === 'function') {
      const openCount = rows.filter((item) => item.status !== 'closed').length;
      onTicketCountChange(openCount);
    }
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
    return () => { mounted = false; };
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

  const sendReply = async () => {
    if (!activeTicket) return;
    if (!reply.trim()) {
      setToast({ type: 'error', message: 'Message vide.' });
      return;
    }

    try {
      setBusy(true);
      await apiRequest(`/api/admin/tickets/${activeTicket._id || activeTicket.id}/reply`, {
        method: 'POST',
        token,
        body: { content: reply.trim() }
      });
      setReply('');
      await loadTickets();
      setToast({ type: 'success', message: 'Réponse envoyée.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const closeTicket = async () => {
    if (!activeTicket) return;
    try {
      setBusy(true);
      await apiRequest(`/api/admin/tickets/${activeTicket._id || activeTicket.id}/close`, {
        method: 'PATCH',
        token
      });
      await loadTickets();
      setToast({ type: 'success', message: 'Ticket fermé.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="glass card" style={{ padding: 18 }}>
        <div className="eyebrow">Support</div>
        <h2 className="title-md" style={{ marginTop: 6 }}>Inbox</h2>
        <div className="skeleton" style={{ height: 14, marginTop: 18 }} />
        <div className="skeleton" style={{ height: 200, marginTop: 16 }} />
      </div>
    );
  }

  return (
    <div className="grid-2" style={{ gap: 16 }}>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {busy && <LoaderOverlay label="Traitement..." />}

      <section className="glass card" style={{ padding: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="eyebrow">Support</div>
            <h2 className="title-md" style={{ marginTop: 6 }}>Inbox</h2>
          </div>
          <span className="badge badge-outline-pink">{tickets.length} tickets</span>
        </div>

        <div className="stack premium-scroll" style={{ marginTop: 14, maxHeight: 520, paddingRight: 6 }}>
          {(tickets || []).length === 0 && <div className="text-muted" style={{ padding: 12 }}>Aucun ticket.</div>}
          {(tickets || []).map((t) => {
            const id = t?._id || t?.id;
            const isActive = id === activeId;
            const latest = Array.isArray(t.messages) && t.messages.length ? t.messages[t.messages.length - 1] : null;
            return (
              <button key={id} className={`ticket-item ${isActive ? 'ticket-item-active' : ''}`} onClick={() => setActiveId(id)}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                    <span className="ticket-icon"><Inbox size={16} /></span>
                    <div className="ticket-title">
                      <div className="ticket-subject">{t.subject}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {t.createdBy?.username ? `@${t.createdBy.username}` : 'participant'} • {formatDate(t.updatedAt || t.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${t.status === 'closed' ? 'badge-outline-neutral' : 'badge-outline-green'}`}>{t.status}</span>
                </div>
                {latest && <div className="text-muted" style={{ fontSize: 12, marginTop: 8, textAlign: 'left' }}>{latest.content}</div>}
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
                <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  <Shield size={14} style={{ marginRight: 6 }} />
                  {activeTicket.createdBy?.username ? `@${activeTicket.createdBy.username}` : 'participant'}
                </div>
              </div>
              <button className="btn btn-outline" onClick={closeTicket} disabled={activeTicket.status === 'closed'}>
                <X size={16} />
                Fermer
              </button>
            </div>

            <div className="ticket-thread premium-scroll" style={{ marginTop: 14, maxHeight: 520, paddingRight: 6 }}>
              {(activeTicket.messages || []).map((m) => (
                <div key={m._id} className={`ticket-bubble ${m.senderRole === 'admin' ? 'ticket-bubble-admin' : 'ticket-bubble-user'}`}>
                  <div className="ticket-bubble-meta">
                    <span>{m.senderRole === 'admin' ? 'Admin' : 'Participant'}</span>
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
                  <textarea className="input" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
                </div>
                <button className="btn btn-outline-accent" onClick={sendReply}>
                  <Send size={16} />
                  Envoyer
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
