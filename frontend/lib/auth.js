const AUTH_KEY = 'ctf_platform_auth';

export function getStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) {
      return { token: null, user: null };
    }
    const parsed = JSON.parse(raw);
    return {
      token: parsed?.token || null,
      user: parsed?.user || null
    };
  } catch {
    return { token: null, user: null };
  }
}

export function setStoredAuth(token, user) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_KEY);
}

export function isAdminUser(user) {
  return user?.role === 'admin';
}
