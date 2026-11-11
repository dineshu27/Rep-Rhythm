import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { brandMatrix, validBrandColor } from '@/lib/brand-theme';
export const runtime = 'nodejs';
let source: Promise<Buffer> | undefined;
export async function GET(request: Request) {
 const params=new URL(request.url).searchParams;const raw=params.get('color');const size=Number(params.get('size')??192);const mask=params.get('mask')==='1';
 if(!raw||!/^#[0-9a-f]{6}$/i.test(raw)||![16,32,64,180,192,512].includes(size))return new Response('Invalid icon options.',{status:400});
 source??=readFile(path.join(process.cwd(),'public/icon-512.png'));
 try {let image=sharp(await source).recomb(brandMatrix(validBrandColor(raw)));if(mask)image=image.resize(Math.round(size*.94)).extend({top:Math.floor((size-Math.round(size*.94))/2),bottom:Math.ceil((size-Math.round(size*.94))/2),left:Math.floor((size-Math.round(size*.94))/2),right:Math.ceil((size-Math.round(size*.94))/2),background:'#100010'});else image=image.resize(size,size);
 const buffer=await image.png().toBuffer();return new Response(new Uint8Array(buffer),{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400, s-maxage=31536000, immutable','X-Content-Type-Options':'nosniff'}});
 }catch{source=undefined;return new Response('Icon unavailable.',{status:503});}
}
