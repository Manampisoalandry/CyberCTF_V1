"use client";

import { motion } from 'framer-motion';
import { BellRing, CheckCircle2, MessageSquare, Sparkles, Unlock } from 'lucide-react';

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString('fr-FR');
  } catch {
    return '';
  }
}

function iconForKind(kind) {
  if (kind === 'ticket') return <MessageSquare size={15} />;
  if (kind === 'unlock') return <Unlock size={15} />;
  if (kind === 'hint') return <Sparkles size={15} />;
  return <CheckCircle2 size={15} />;
}

export default function NotificationCenter({
  items = [],
  title = 'Centre de notifications',
  subtitle = 'Toutes les dernières alertes temps réel',
  emptyLabel = 'Aucune notification pour le moment.',
  onMarkRead
}) {
  return (
    <section className="glass card notifications-panel">
      <div className="row-between notifications-head">
        <div>
          <div className="eyebrow">Notifications</div>
          <h2 className="title-md" style={{ marginTop: 6 }}>{title}</h2>
          <p className="text-muted" style={{ marginTop: 6 }}>{subtitle}</p>
        </div>
        <div className="row-wrap" style={{ gap: 8 }}>
          <span className="badge badge-outline-pink"><BellRing size={12} /> {items.length}</span>
          {typeof onMarkRead === 'function' ? (
            <button className="btn btn-soft" onClick={onMarkRead}>Tout marquer comme vu</button>
          ) : null}
        </div>
      </div>

      <div className="notifications-list premium-scroll">
        {items.length === 0 && <div className="text-muted">{emptyLabel}</div>}

        {items.map((item) => (
          <motion.article key={item.id} className={`notification-item ${item.unread ? 'notification-item-unread' : ''}`} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.24 }}>
            <div className={`notification-accent ${item.tone || 'pink'}`} />
            <div className="notification-icon">{iconForKind(item.kind)}</div>
            <div className="notification-body">
              <div className="notification-title-row">
                <h3 className="notification-title">{item.title}</h3>
                {item.unread ? <span className="badge badge-live">NEW</span> : <span className="badge badge-outline-neutral">vu</span>}
              </div>
              <p className="text-muted notification-copy">{item.message}</p>
              <div className="notification-meta">{formatDateTime(item.timestamp)}</div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
