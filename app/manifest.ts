import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { id: '/', name: 'FitTrack AI', short_name: 'FitTrack', description: 'Food, workouts, and progress in your personal workspace', start_url: '/', scope: '/', display: 'standalone', background_color: '#11150f', theme_color: '#11150f', icons: [
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ] };
}
