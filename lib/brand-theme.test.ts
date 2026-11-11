import { expect,it } from 'vitest';
import { brandAdjustment,brandMatrix,validBrandColor } from './brand-theme';
it('validates theme inputs and keeps the default logo unchanged',()=>{expect(validBrandColor('bad')).toBe('#7943c4');expect(brandAdjustment('#7943c4').angle).toBe(0);expect(brandMatrix('#7943c4')).toEqual([[1,0,0],[0,1,0],[0,0,1]]);});
it('keeps white lettering white while recolouring accents, including graphite',()=>{for(const color of ['#1768c4','#137b61','#be386e','#a96613','#596176','#ffffff','#000000'])for(const row of brandMatrix(color))expect(row.reduce((a,b)=>a+b,0)).toBeCloseTo(1,5);expect(brandAdjustment('#000000').saturation).toBe(0);});
