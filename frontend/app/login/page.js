"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import LoaderOverlay from '@/components/LoaderOverlay';
import Toast from '@/components/Toast';
import { apiRequest } from '@/lib/api';
import { getStoredAuth, isAdminUser, setStoredAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const { token, user } = getStoredAuth();
      if (token && user) {
        router.replace(isAdminUser(user) ? '/admin' : '/dashboard');
        return;
      }
      setScreenLoading(false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (searchParams.get('verifyEmail') === '1') {
      setToast({
        type: 'info',
        message: 'Compte créé. Vérifie ton email puis connecte-toi.'
      });
      const email = searchParams.get('email') || '';
      if (email) setPendingVerificationEmail(email);
    }
  }, [searchParams]);

  const handleLogin = async ({ email, password }) => {
    if (!email || !password) {
      setToast({ type: 'error', message: 'Merci de remplir email et mot de passe.' });
      return;
    }

    try {
      setLoading(true);
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      setStoredAuth(data.token, data.user);
      setToast({ type: 'success', message: `Bienvenue ${data.user.username} !` });

      window.setTimeout(() => {
        router.replace(isAdminUser(data.user) ? '/admin' : '/dashboard');
      }, 220);
    } catch (error) {
      if (/not verified/i.test(error.message || '')) {
        setPendingVerificationEmail(email);
      }
      setToast({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) {
      setToast({ type: 'error', message: 'Entre ton email avant de renvoyer la confirmation.' });
      return;
    }

    try {
      setResending(true);
      const data = await apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: { email: pendingVerificationEmail }
      });
      setToast({ type: 'success', message: data.message || 'Email de confirmation renvoyé.' });
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <LoaderOverlay show={screenLoading} label="Chargement..." />
      {!screenLoading && (
        <div className="stack" style={{ minHeight: '100vh' }}>
          <AuthForm
            mode="login"
            loading={loading}
            onSubmit={handleLogin}
            onSwitch={() => router.push('/register')}
          />
          {pendingVerificationEmail ? (
            <div className="container" style={{ marginTop: '-2rem', marginBottom: '2rem' }}>
              <div className="glass card" style={{ maxWidth: 560, margin: '0 auto' }}>
                <div className="eyebrow">Email confirmation</div>
                <h2 className="panel-title title-md">Ton compte attend une confirmation</h2>
                <p className="text-muted">Nous avons bloqué la connexion tant que l’adresse <strong>{pendingVerificationEmail}</strong> n’est pas confirmée.</p>
                <div className="row-wrap" style={{ marginTop: 12 }}>
                  <button className="btn btn-accent" disabled={resending} onClick={handleResendVerification}>
                    {resending ? 'Envoi...' : 'Renvoyer l’email de confirmation'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
