"use client";

import { motion } from 'framer-motion';

function rankMedal(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}

export default function LeaderboardTable({ rows = [], currentUserId }) {
  return (
    <div className="glass card table-wrap leaderboard-shell">
      <div className="section-heading row-between">
        <div>
          <div className="eyebrow">Leaderboard</div>
          <h2 className="panel-title title-md">Classement général</h2>
        </div>
        <div className="text-muted">Trié par points puis first blood</div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Rang</th>
            <th>Utilisateur</th>
            <th>Rôle</th>
            <th>Points</th>
            <th>Résolus</th>
            <th>First Blood</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user, index) => {
            const userId = user._id || user.id;
            const isCurrent = userId === currentUserId;
            const solves = user.solvedChallengesCount ?? user.solvedCount ?? user.solved?.length ?? 0;

            return (
              <motion.tr
                key={userId || user.email}
                className={isCurrent ? 'table-row-active' : ''}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.24, delay: index * 0.03 }}
              >
                <td>{rankMedal(index)}</td>
                <td>
                  <strong>{user.username}</strong>
                  {isCurrent && <span className="badge badge-success-soft" style={{ marginLeft: 8 }}>Moi</span>}
                </td>
                <td>{user.role}</td>
                <td>{user.points ?? 0}</td>
                <td>{solves}</td>
                <td>{user.firstBloods ?? 0}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
