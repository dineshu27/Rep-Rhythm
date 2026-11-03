'use client';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() {
  function toggle() { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; document.documentElement.style.colorScheme = next; try { localStorage.setItem('fittrack-theme', next); } catch { /* Theme remains usable without storage. */ } }
  return <button type="button" className="shell-icon" aria-label="Toggle light and dark theme" onClick={toggle}><Sun size={19} className="theme-sun"/><Moon size={19} className="theme-moon"/></button>;
}
