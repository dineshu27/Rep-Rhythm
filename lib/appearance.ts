export const accentPresets = [
  { name: 'Violet', color: '#7943c4' }, { name: 'Ocean', color: '#1768c4' }, { name: 'Emerald', color: '#137b61' },
  { name: 'Rose', color: '#be386e' }, { name: 'Amber', color: '#a96613' }, { name: 'Graphite', color: '#596176' },
];
// Self-contained so the same algorithm can run before first paint in the head.
export function appearanceTokens(input: string, mode: string): Record<string, string> {
  const hex = /^#[0-9a-f]{6}$/i.test(input) ? input : '#7943c4';
  const rgb = (color: string) => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  const blend = (color: string, other: string, weight: number) => '#' + rgb(color).map((value, i) => Math.round(value * weight + rgb(other)[i] * (1 - weight)).toString(16).padStart(2, '0')).join('');
  const luminance = (color: string) => rgb(color).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  const dark = mode === 'dark'; const card = dark ? blend(hex, '#13101a', .1) : '#ffffff';
  const background = dark ? blend(hex, '#0b0910', .06) : blend(hex, '#ffffff', .035);
  const soft = dark ? blend(hex, '#1c1725', .17) : blend(hex, '#ffffff', .1);
  let primary = hex;
  for (let step = 0; step <= 100; step++) { primary = blend(hex, dark ? '#ffffff' : '#000000', 1 - step / 100); if ([card, background, soft].every(surface => contrast(primary, surface) >= 4.6)) break; }
  const hue = (color: string) => { const [r,g,b] = rgb(color).map(v=>v/255); const high=Math.max(r,g,b),low=Math.min(r,g,b),d=high-low; return d===0?0:(high===r?(g-b)/d+(g<b?6:0):high===g?(b-r)/d+2:(r-g)/d+4)*60; };
  const rail = blend(hex, '#140d1e', .16); const hero = blend(hex, '#1b1028', .3);
  return {
    '--logo-filter': `hue-rotate(${hue(hex)-hue('#7943c4')}deg) saturate(${Math.max(...rgb(hex))-Math.min(...rgb(hex))<12?0:1})`,
    '--accent-color': hex, '--background': background, '--foreground': dark ? '#f6f1fc' : '#292033', '--card': card,
    '--card-foreground': dark ? '#f6f1fc' : '#292033', '--muted-foreground': dark ? '#bfb2cc' : '#6b5f76',
    '--border': dark ? blend(hex, '#332b40', .15) : blend(hex, '#e6e2ec', .1), '--primary': primary,
    '--primary-foreground': dark ? '#171021' : '#ffffff', '--soft': soft, '--hero': soft,
    '--input': dark ? blend(hex, '#100d17', .08) : blend(hex, '#ffffff', .02), '--rail': rail,
    '--rail-text': blend(hex, '#ffffff', .22), '--rail-active': blend(hex, '#2a203a', .32),
    '--brand-hero': hero, '--brand-hero-end': blend(hex, '#291938', .4), '--brand-highlight': blend(hex, '#ffffff', .24),
    '--brand-muted': blend(hex, '#ffffff', .17), '--brand-border': blend(hex, '#7b698c', .28),
  };
}
export function applyAppearance(mode: string, color: string) {
  const root = document.documentElement; root.dataset.theme = mode; root.dataset.accent = color; root.style.colorScheme = mode;
  for (const [key, value] of Object.entries(appearanceTokens(color, mode))) root.style.setProperty(key, value);
}
export function changeAppearance(mode: string, color: string) {
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#7943c4';
  applyAppearance(mode, safeColor);
  try { localStorage.setItem('fittrack-theme', mode); localStorage.setItem('fittrack-accent', safeColor); } catch { /* Colour changes remain usable without persistence. */ }
  window.dispatchEvent(new Event('fittrack-appearance'));
}
export const appearanceScript = `(function(){var mode='dark',color='#7943c4';try{var saved=localStorage.getItem('fittrack-theme');mode=saved==='light'||saved==='dark'?saved:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';var accent=localStorage.getItem('fittrack-accent');if(/^#[0-9a-f]{6}$/i.test(accent||''))color=accent}catch(e){}var root=document.documentElement;root.dataset.theme=mode;root.dataset.accent=color;root.style.colorScheme=mode;var tokens=(${appearanceTokens.toString()})(color,mode);Object.keys(tokens).forEach(function(key){root.style.setProperty(key,tokens[key])})})()`;
