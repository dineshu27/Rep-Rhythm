import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { id: '/', name: 'FitAi', short_name: 'FitAi', description: 'Food, workouts, and progress in your personal workspace', start_url: '/', scope: '/', display: 'standalone', background_color: '#100c1a', theme_color: '#100c1a', icons: [
    { src: '/icon-192.png?v=fitai-arm-9', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png?v=fitai-arm-9', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable.png?v=fitai-arm-9', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ] };
}
