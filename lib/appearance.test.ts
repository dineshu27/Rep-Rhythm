import { describe, expect, it } from 'vitest';
import { accentPresets, appearanceTokens, appearanceScript } from './appearance';
function luminance(hex: string) { return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(s => s<=.04045?s/12.92:((s+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0); }
function contrast(a: string,b: string) { return (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05); }
describe('user colour choices',()=>{
 for(const color of [...accentPresets.map(row=>row.color),'#ffffff','#000000','#ffff00','#00ff00','#00ffff','#ff00ff']) for(const mode of ['light','dark']) it(`${color} is readable in ${mode}`,()=>{const tokens=appearanceTokens(color,mode);for(const surface of ['--background','--card','--soft']) expect(contrast(tokens['--primary'],tokens[surface])).toBeGreaterThanOrEqual(4.5);expect(contrast(tokens['--primary'],tokens['--primary-foreground'])).toBeGreaterThanOrEqual(4.5);});
 it('validates persisted colours before using them in style values',()=>{expect(appearanceTokens('invalid','light')).toEqual(appearanceTokens('#7943c4','light'));});
 it('boot script restores the palette before hydration without external helpers',()=>{const root={dataset:{} as Record<string,string>,style:{colorScheme:'',setProperty:()=>{}}};new Function('document','localStorage','matchMedia',appearanceScript)({documentElement:root},{getItem:(key:string)=>key==='fittrack-theme'?'dark':'#1768c4'},()=>({matches:false}));expect(root.dataset).toEqual({theme:'dark',accent:'#1768c4'});});
});
