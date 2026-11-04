'use client';
import { useEffect } from 'react';

export function OfflineSupport() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let stopped = false;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const subscriptions: Array<{ worker: ServiceWorker; listener: () => void }> = [];
    function retry() {
      if (!stopped && attempts < 3) {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => { void install(); }, 500 * 2 ** attempts);
      }
    }
    async function install() {
      if (stopped) return;
      attempts += 1;
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        if (stopped) return;
        const worker = registration.installing;
        if (worker) {
          const listener = () => { if (worker.state === 'redundant' && !registration.active) retry(); };
          worker.addEventListener('statechange', listener);
          subscriptions.push({ worker, listener });
        } else if (!registration.active && !registration.waiting) retry();
      } catch { retry(); }
    }
    function online() { attempts = 0; void install(); }
    void install();
    window.addEventListener('online', online);
    return () => {
      stopped = true; clearTimeout(retryTimer); window.removeEventListener('online', online);
      for (const { worker, listener } of subscriptions) worker.removeEventListener('statechange', listener);
    };
  }, []);
  return null;
}
