"use client";

import { motion } from 'framer-motion';
import { BellRing, Crown, Sparkles, Trophy } from 'lucide-react';

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString('fr-FR');
  } catch {
    return '';
  }
}

export default function LiveFeedPanel({
  items = [],
  title = 'Feed live',
  subtitle = 'Résolutions et activité récentes',
  emptyLabel = 'Aucune activité récente pour le moment.'
}) {
  return (
    <section className="glass card live-feed-panel">
      <div className="row-between live-feed-head">
        <div>
          <div className="eyebrow">Temps réel</div>
          <h3 className="title-md" style={{ marginTop: 6 }}>{title}</h3>
          <p className="text-muted" style={{ marginTop: 6 }}>{subtitle}</p>
        </div>
        <span className="badge badge-outline-pink"><BellRing size={12} /> {items.length}</span>
      </div>

      <div className="live-feed-list premium-scroll">
        {items.length === 0 && <div className="text-muted">{emptyLabel}</div>}

        {items.map((item) => (
          <motion.div key={item.id} className="live-feed-item" initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.28 }}>
            <div className="live-feed-item-row">
              <div className="live-feed-icon">
                {item.firstBlood ? <Crown size={14} /> : <Trophy size={14} />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="live-feed-title">{item.actorName || 'Participant'} a validé {item.challengeTitle || 'un challenge'}</div>
                <div className="text-muted live-feed-copy">
                  {item.challengeType || 'Challenge'} • +{item.totalAwarded || 0} pts
                  {item.firstBlood ? ' • First Blood' : item.solveOrder ? ` • #${item.solveOrder}` : ''}
                </div>
              </div>
            </div>
            <div className="live-feed-meta">
              <span className="badge badge-outline-green"><Sparkles size={12} /> {formatDateTime(item.submittedAt || item.createdAt)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
