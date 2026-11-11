export const defaultBrandColor = '#7943c4';
export function validBrandColor(input: string | null) { return input && /^#[0-9a-f]{6}$/i.test(input) ? input.toLowerCase() : defaultBrandColor; }
function hue(color: string) {
 const [r,g,b] = [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 return d===0?0:((max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)*60);
}
export function brandAdjustment(color: string) {
 color=validBrandColor(color);const values=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 return {angle:hue(color)-hue(defaultBrandColor),saturation:Math.max(...values)-Math.min(...values)<12?0:1};
}
export function brandFilter(color: string) {const {angle,saturation}=brandAdjustment(color);return `hue-rotate(${angle}deg) saturate(${saturation})`;}
export function brandMatrix(color: string): [[number,number,number],[number,number,number],[number,number,number]] {
 const {angle,saturation}=brandAdjustment(color);const c=Math.cos(angle*Math.PI/180),s=Math.sin(angle*Math.PI/180);
 const rotate=[[.213+.787*c-.213*s,.715-.715*c-.715*s,.072-.072*c+.928*s],[.213-.213*c+.143*s,.715+.285*c+.140*s,.072-.072*c-.283*s],[.213-.213*c-.787*s,.715-.715*c+.715*s,.072+.928*c+.072*s]];
 const sat=[[.213+.787*saturation,.715-.715*saturation,.072-.072*saturation],[.213-.213*saturation,.715+.285*saturation,.072-.072*saturation],[.213-.213*saturation,.715-.715*saturation,.072+.928*saturation]];
 return sat.map(row=>[0,1,2].map(col=>row.reduce((sum,value,k)=>sum+value*rotate[k][col],0)) as [number,number,number]) as [[number,number,number],[number,number,number],[number,number,number]];
}
