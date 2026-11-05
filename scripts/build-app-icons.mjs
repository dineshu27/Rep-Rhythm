// Derive all app icons from the code-native SVG. Sharp ships with Next.js.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const svg = await readFile(new URL('public/icon.svg', root));
const background = '#140b24';
for (const [file, size] of [['favicon-16x16.png',16], ['favicon-32x32.png',32], ['icon-192.png',192], ['icon-512.png',512], ['apple-touch-icon.png',180]]) {
  let icon = sharp(svg).resize(size,size);
  if (file === 'apple-touch-icon.png') icon = icon.flatten({background});
  await icon.png().toFile(new URL(`public/${file}`,root).pathname);
}
// Let Android apply its own icon shape. Keep the mark inside its safe area.
const maskable = svg.toString().replace('rx="112"','rx="0"');
await sharp(Buffer.from(maskable)).resize(512,512).flatten({background}).png().toFile(new URL('public/icon-maskable.png',root).pathname);
// A conventional multi-resolution ICO containing 32-bit DIB images, including
// bottom-up BGRA pixels and an AND transparency mask for older icon readers.
const sizes = [16,32,48]; const entries=[]; const images=[]; let offset=6+16*sizes.length;
for(const size of sizes) {
  const {data}=await sharp(svg).resize(size,size).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const maskStride=Math.ceil(size/32)*4;
  const image=Buffer.alloc(40+size*size*4+maskStride*size);
  image.writeUInt32LE(40,0); image.writeInt32LE(size,4); image.writeInt32LE(size*2,8); image.writeUInt16LE(1,12); image.writeUInt16LE(32,14); image.writeUInt32LE(size*size*4+maskStride*size,20);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const source=(y*size+x)*4; const target=40+((size-1-y)*size+x)*4;
    image[target]=data[source+2];image[target+1]=data[source+1];image[target+2]=data[source];image[target+3]=data[source+3];
    if(data[source+3]<128) image[40+size*size*4+(size-1-y)*maskStride+(x>>3)]|=1<<(7-(x%8));
  }
  const entry=Buffer.alloc(16);entry[0]=size;entry[1]=size;entry.writeUInt16LE(1,4);entry.writeUInt16LE(32,6);entry.writeUInt32LE(image.length,8);entry.writeUInt32LE(offset,12);
  entries.push(entry);images.push(image);offset+=image.length;
}
const header=Buffer.alloc(6);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
await writeFile(new URL('app/favicon.ico',root),Buffer.concat([header,...entries,...images]));
console.log('Generated browser favicons, iPhone icon, and Android app icons.');
