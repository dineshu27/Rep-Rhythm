'use client';
import { useEffect } from 'react';

// Supabase email templates can return either a PKCE code or an implicit session.
// Consume the latter once, remove it from browser history, and store it as SSR cookies.
export function AuthReturn() {
  useEffect(() => {
    if (!['/', '/auth'].includes(window.location.pathname)) return;
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    if (fragment.has('error') || fragment.has('error_code')) {
      window.history.replaceState(null, '', url.pathname);
      window.location.replace('/auth?error=expired');
      return;
    }
    const access_token = fragment.get('access_token');
    const refresh_token = fragment.get('refresh_token');
    if (fragment.has('access_token') || fragment.has('refresh_token')) {
      window.history.replaceState(null, '', url.pathname);
      if (!access_token || !refresh_token) { window.location.replace('/auth?error=callback'); return; }
      void fetch('/api/auth/complete', { method: 'POST', cache: 'no-store', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token, refresh_token }) })
        .then(response => { window.location.replace(response.ok ? '/auth?connected=1' : '/auth?error=expired'); })
        .catch(() => { window.location.replace('/auth?error=network'); });
      return;
    }
    const code = url.searchParams.get('code');
    if (code) window.location.replace('/auth/callback?code=' + encodeURIComponent(code));
  }, []);
  return null;
}
