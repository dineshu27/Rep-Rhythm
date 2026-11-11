'use client';
import {useEffect} from 'react';
import {refreshHealth} from '@/lib/health-store';
export function HealthAutoSync(){useEffect(()=>{const refresh=()=>{try{if(document.visibilityState==='visible'&&localStorage.getItem('fitai-health-auto')==='true')void refreshHealth();}catch{}};void refreshHealth();const interval=setInterval(refresh,30000);document.addEventListener('visibilitychange',refresh);window.addEventListener('fitai-health-refresh',refresh);window.addEventListener('focus',refresh);return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('fitai-health-refresh',refresh);window.removeEventListener('focus',refresh);};},[]);return null;}
