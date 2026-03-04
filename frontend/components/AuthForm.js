"use client";

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  User,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import AnimatedBackdrop from '@/components/AnimatedBackdrop';
import CyberParticles from '@/components/CyberParticles';
import GlitchText from '@/components/GlitchText';
import MotionReveal from '@/components/MotionReveal';

export default function AuthForm({
  mode = 'login',
  onSubmit,
  onSwitch,
  loading
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const copy = useMemo(() => {
    if (mode === 'register') {
      return {
        eyebrow: 'Create account',
        formEyebrow: 'NEW PARTICIPANT',
        button: 'CREATE ACCOUNT',
        switchText: 'Already have an account?',
        switchAction: 'Login',
        helper: 'Your account is created as a participant by default. A confirmation email is required before login.'
      };
    }

    return {
      eyebrow: 'Authenticate',
      formEyebrow: 'AUTHENTICATE',
      button: 'LOGIN',
      switchText: "Don't have an account?",
      switchAction: 'Register',
      helper: 'Default admin: admin@ctf.com / admin123'
    };
  }, [mode]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit?.(form);
  };

  return (
    <div className="auth-neo page">
      <div className="auth-noise" />
      <AnimatedBackdrop variant={mode === 'register' ? 'register' : 'auth'} />
      <CyberParticles density={44} className="auth-particles" />
      <div className="container auth-container">
        <div className="auth-shell-v2">
          <MotionReveal className="auth-brand-v2" delay={0.08}>
            <div className="auth-brand-icon-wrap">
              <div className="auth-brand-icon-glow" />
              <div className="auth-brand-icon">
                <Shield size={28} strokeWidth={2.1} />
              </div>
            </div>
            <h1 className="auth-brand-title">
              <GlitchText>Cyber<span>CTF</span></GlitchText>
            </h1>
            <p className="auth-brand-subtitle">Capture The Flag Platform</p>
            <motion.div className="auth-floating-chips" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.45 }}>
              <span className="badge badge-outline-green">Live Score</span>
              <span className="badge badge-outline-pink">GSAP Motion</span>
              <span className="badge badge-outline-neutral">SVG FX</span>
            </motion.div>
          </MotionReveal>

          <MotionReveal delay={0.18}>
            <motion.form
              className="glass auth-card-v2 auth-card-animated"
              onSubmit={submit}
              initial={{ rotateX: 8, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
            <div className="auth-card-line" />
            <div className="auth-form-eyebrow">
              <ChevronRight size={15} />
              <span>{copy.formEyebrow}</span>
            </div>

            <div className="auth-fields-v2">
              {mode === 'register' && (
                <label className="auth-label-block">
                  <span className="auth-label-v2">Username</span>
                  <div className="auth-input-shell-v2">
                    <span className="auth-input-icon-v2">
                      <User size={17} />
                    </span>
                    <input
                      className="auth-input-v2"
                      placeholder="Your handle"
                      value={form.username}
                      onChange={(event) => updateField('username', event.target.value)}
                      autoComplete="username"
                    />
                    <span className="auth-input-chip subtle">
                      <Sparkles size={14} />
                    </span>
                  </div>
                </label>
              )}

              <label className="auth-label-block">
                <span className="auth-label-v2">Email</span>
                <div className="auth-input-shell-v2">
                  <span className="auth-input-icon-v2">
                    <Mail size={17} />
                  </span>
                  <input
                    className="auth-input-v2"
                    placeholder="admin@ctf.com"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    autoComplete="email"
                  />
                  <span className="auth-input-chip accent">
                    <Sparkles size={14} />
                  </span>
                </div>
              </label>

              <label className="auth-label-block">
                <span className="auth-label-v2">Password</span>
                <div className="auth-input-shell-v2">
                  <span className="auth-input-icon-v2">
                    <Lock size={17} />
                  </span>
                  <input
                    className="auth-input-v2"
                    placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="auth-icon-button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <motion.button
                type="submit"
                className="btn auth-submit-v2"
                disabled={loading}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
              >
                <span className="auth-submit-shine" />
                <span className="auth-submit-label">{loading ? 'PLEASE WAIT...' : copy.button}</span>
              </motion.button>
            </div>

            <div className="auth-switch-v2">
              <span>{copy.switchText}</span>
              <button type="button" className="auth-switch-link" onClick={onSwitch}>
                {copy.switchAction}
              </button>
            </div>

            <div className="auth-helper-v2">{copy.helper}</div>
            </motion.form>
          </MotionReveal>
        </div>
      </div>
    </div>
  );
}
