'use client';
import { changeAppearance } from '@/lib/appearance';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() {
  function toggle() { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; changeAppearance(next, document.documentElement.dataset.accent || '#7943c4'); }
  return <button type="button" className="shell-icon" aria-label="Toggle light and dark theme" onClick={toggle}><Sun size={19} className="theme-sun"/><Moon size={19} className="theme-moon"/></button>;
}
