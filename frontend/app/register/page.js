"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import LoaderOverlay from '@/components/LoaderOverlay';
import Toast from '@/components/Toast';
import { apiRequest } from '@/lib/api';
import { getStoredAuth, isAdminUser } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);
  const [toast, setToast] = useState(null);

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

  const handleRegister = async ({ username, email, password }) => {
    if (!username || !email || !password) {
      setToast({ type: 'error', message: 'Merci de remplir tous les champs.' });
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: { username, email, password }
      });

      setToast({
        type: 'success',
        message: data.message || 'Compte créé. Vérifie ton email avant de te connecter.'
      });

      window.setTimeout(() => {
        router.replace(`/login?verifyEmail=1&email=${encodeURIComponent(email)}`);
      }, 600);
    } catch (error) {
      setToast({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <LoaderOverlay show={screenLoading} label="Chargement..." />
      {!screenLoading && (
        <AuthForm
          mode="register"
          loading={loading}
          onSubmit={handleRegister}
          onSwitch={() => router.push('/login')}
        />
      )}
    </>
  );
}
