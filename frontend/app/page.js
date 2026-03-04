"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoaderOverlay from '@/components/LoaderOverlay';
import { getStoredAuth, isAdminUser } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const { token, user } = getStoredAuth();

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    router.replace(isAdminUser(user) ? '/admin' : '/dashboard');
  }, [router]);

  return <LoaderOverlay show label="Redirection..." />;
}
