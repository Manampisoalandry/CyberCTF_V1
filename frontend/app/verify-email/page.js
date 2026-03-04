"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import LoaderOverlay from '@/components/LoaderOverlay';
import AnimatedBackdrop from '@/components/AnimatedBackdrop';
import MotionReveal from '@/components/MotionReveal';
import Toast from '@/components/Toast';
import { apiRequest } from '@/lib/api';
import { isAdminUser, setStoredAuth } from '@/lib/auth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState({ ok: false, message: '' });

  useEffect(() => {
    const token = String(searchParams.get('token') || '').trim();

    const run = async () => {
      if (!token) {
        setStatus({ ok: false, message: 'Lien de confirmation invalide.' });
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest('/api/auth/verify-email', {
          method: 'POST',
          body: { token }
        });

        if (data.token && data.user) {
          setStoredAuth(data.token, data.user);
          setToast({ type: 'success', message: 'Email confirmé. Redirection...' });
          setStatus({ ok: true, message: 'Ton email est confirmé. Tu vas être redirigé.' });
          window.setTimeout(() => {
            router.replace(isAdminUser(data.user) ? '/admin' : '/dashboard');
          }, 900);
        } else {
          setStatus({ ok: true, message: data.message || 'Email confirmé.' });
        }
      } catch (error) {
        setStatus({ ok: false, message: error.message || 'Le lien de confirmation est invalide ou expiré.' });
        setToast({ type: 'error', message: error.message || 'Confirmation impossible.' });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="page auth-neo">
      <AnimatedBackdrop variant="verify" />
      <Toast toast={toast} onClose={() => setToast(null)} />
      <LoaderOverlay show={loading} label="Confirmation de l'email..." />
      <div className="container" style={{ paddingTop: '10vh' }}>
        <MotionReveal delay={0.12}>
          <div className="glass card auth-card-animated" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="eyebrow">Email verification</div>
          <h1 className="title-lg" style={{ marginTop: 8 }}>{status.ok ? 'Compte activé' : 'Confirmation impossible'}</h1>
          <p className="text-muted" style={{ marginTop: 12 }}>{status.message || 'Vérification en cours...'}</p>
          {!loading ? (
            <div className="row-wrap" style={{ marginTop: 18 }}>
              <Link href="/login" className="btn btn-soft">Aller à la connexion</Link>
              <Link href="/register" className="btn btn-outline-accent">Créer un autre compte</Link>
            </div>
          ) : null}
          </div>
        </MotionReveal>
      </div>
    </div>
  );
}
