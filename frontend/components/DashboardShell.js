"use client";

import { LogOut, Shield, Sparkles, User } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedBackdrop from '@/components/AnimatedBackdrop';
import CyberParticles from '@/components/CyberParticles';
import CursorGlow from '@/components/CursorGlow';
import GlitchText from '@/components/GlitchText';
import MotionReveal from '@/components/MotionReveal';

export default function DashboardShell({
  title,
  subtitle,
  user,
  onLogout,
  sidebar,
  topActions,
  children
}) {
  const isAdmin = user?.role === 'admin';

  return (
    <div className="page page-premium">
      <CursorGlow />
      <div className="page-aurora page-aurora-a" />
      <div className="page-aurora page-aurora-b" />
      <AnimatedBackdrop variant="dashboard" />
      <CyberParticles density={56} className="dashboard-particles" />

      <div className="container dashboard-shell-v3">
        <MotionReveal delay={0.06}>
          <section className="glass shell-banner shell-banner-animated">
          <div className="shell-banner-copy">
            <div className="eyebrow shell-kicker">
              <Sparkles size={13} />
              CyberCTF // {isAdmin ? 'Control Room' : 'Arena'}
            </div>
            <h1 className="title-xl shell-title"><GlitchText>{title}</GlitchText></h1>
            <p className="header-meta shell-subtitle">{subtitle}</p>

            <div className="row-wrap shell-reference-tags">
              <span className="badge badge-outline-green">CTFd-inspired flow</span>
              <span className="badge badge-outline-pink">HTB-style neon</span>
              <span className="badge badge-outline-neutral">Rose + Green palette</span>
            </div>
          </div>

          <div className="shell-user-stack">
            {topActions ? <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>{topActions}</div> : null}

            <div className="glass user-identity-card">
              <div className="text-muted shell-user-label">Connecté en tant que</div>
              <div className="row shell-user-main">
                <span className={`shell-avatar ${isAdmin ? 'shell-avatar-admin' : 'shell-avatar-user'}`}>
                  {isAdmin ? <Shield size={16} /> : <User size={16} />}
                </span>
                <div>
                  <div className="shell-username">{user?.username}</div>
                  <div className="shell-role-line">
                    <span className={`role-pill ${isAdmin ? 'role-pill-admin' : 'role-pill-user'}`}>
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <motion.button className="btn btn-outline-accent row shell-logout" onClick={onLogout} whileHover={{ y: -2, x: 1 }} whileTap={{ scale: 0.98 }}>
              <LogOut size={16} />
              Déconnexion
            </motion.button>
          </div>
          </section>
        </MotionReveal>

        <div className="sidebar-layout shell-layout">
          <MotionReveal delay={0.12}>
            <aside className="sidebar glass card nav-panel shell-panel-animated">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Navigation</div>
            <div className="stack">
              {sidebar}
            </div>
            </aside>
          </MotionReveal>

          <MotionReveal delay={0.18} className="shell-content">
            <main>{children}</main>
          </MotionReveal>
        </div>
      </div>
    </div>
  );
}
