'use client';
import {useEffect} from 'react';
import {refreshHealth} from '@/lib/health-store';
export function HealthAutoSync(){
 useEffect(()=>{
  // A new sign-in or another browser tab may establish the session after mount.
  // Focus refresh must not depend on a local flag from an earlier pairing.
  const refresh=()=>{if(document.visibilityState==='visible')void refreshHealth();};
  const scheduledRefresh=()=>{try{if(localStorage.getItem('fitai-health-auto')==='true')refresh();}catch{}};
  void refreshHealth();
  const interval=setInterval(scheduledRefresh,30000);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('fitai-health-refresh',refresh);
  window.addEventListener('focus',refresh);
  return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('fitai-health-refresh',refresh);window.removeEventListener('focus',refresh);};
 },[]);
 return null;
}
