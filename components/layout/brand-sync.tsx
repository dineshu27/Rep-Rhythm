'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { applyAppearance } from '@/lib/appearance';
import { brandFilter, defaultBrandColor, validBrandColor } from '@/lib/brand-theme';
export function BrandSync(){
 const pathname=usePathname();
 useEffect(()=>{function refresh(){const color=validBrandColor(document.documentElement.dataset.accent??null);document.documentElement.style.setProperty('--logo-filter',brandFilter(color));
 const normal=color===defaultBrandColor;document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach(link=>{const size=link.sizes.value==='16x16'?16:32;link.href=normal?`/favicon-${size}x${size}.png?v=fitai-arm-9`:`/api/brand/icon?color=${encodeURIComponent(color)}&size=${size}&v=1`;});
 document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]').forEach(link=>{link.href=normal?'/apple-touch-icon.png?v=fitai-arm-9':`/api/brand/icon?color=${encodeURIComponent(color)}&size=180&v=1`;});
 const manifest=document.querySelector<HTMLLinkElement>('link[rel="manifest"]');if(manifest)manifest.href=normal?'/manifest.webmanifest':`/api/brand/manifest?color=${encodeURIComponent(color)}`;
 }refresh();window.addEventListener('fittrack-appearance',refresh);const storage=(event: StorageEvent)=>{if(event.key!==null&&event.key!=='fittrack-theme'&&event.key!=='fittrack-accent')return;try{applyAppearance(localStorage.getItem('fittrack-theme')==='light'?'light':'dark',validBrandColor(localStorage.getItem('fittrack-accent')));}catch{}refresh();};window.addEventListener('storage',storage);return()=>{window.removeEventListener('fittrack-appearance',refresh);window.removeEventListener('storage',storage);};},[pathname]);
 return null;
}
