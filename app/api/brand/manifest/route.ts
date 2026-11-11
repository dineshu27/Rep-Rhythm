import manifest from '@/app/manifest';
import { validBrandColor } from '@/lib/brand-theme';
export async function GET(request: Request) {
 const color=validBrandColor(new URL(request.url).searchParams.get('color'));const base=manifest();
 return Response.json({...base,theme_color:color,icons:[192,512].map(size=>({src:`/api/brand/icon?color=${encodeURIComponent(color)}&size=${size}&v=1`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'})).concat([{src:`/api/brand/icon?color=${encodeURIComponent(color)}&size=512&mask=1&v=1`,sizes:'512x512',type:'image/png',purpose:'maskable'}])},{headers:{'Content-Type':'application/manifest+json','Cache-Control':'public, max-age=3600'}});
}
