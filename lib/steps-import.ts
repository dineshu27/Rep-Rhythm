import {dateSchema,metricSchema,type Workspace} from './workspace';
export function parseStepCsv(text:string){
 if(text.length>1_000_000)throw Error('Choose a CSV smaller than 1 MB.');
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(line=>line.trim());if(lines.length<2||lines.length>3661)throw Error('Include a header and 1–3,660 daily records.');
 const header=lines.shift()!.trim().toLowerCase().replace(/\s/g,'');if(header!=='date,steps')throw Error('Use the header date,steps with one daily total per row.');const dates=new Set<string>();
 return lines.map((line,index)=>{const parts=line.split(',').map(value=>value.trim());if(parts.length!==2||!dateSchema.safeParse(parts[0]).success||!/^\d+$/.test(parts[1]))throw Error(`Check date and whole-number steps on row ${index+2}.`);const row={date:parts[0],steps:Number(parts[1])};if(row.steps>100000)throw Error(`Step count is too high on row ${index+2}.`);if(dates.has(row.date))throw Error(`Duplicate date ${row.date}. Export one daily total per date to avoid counting steps twice.`);dates.add(row.date);return row;});
}
export function importSteps(data:Workspace,rows:{date:string;steps:number}[],replace:boolean,today:string){
 if(rows.some(row=>row.date>today))throw Error('Future dates cannot be imported as completed activity.');
 const metrics=[...data.metrics];let imported=0;for(const row of rows){const index=metrics.findIndex(item=>item.date===row.date);if(index>=0&&!replace)continue;const value=metricSchema.parse({... (index>=0?metrics[index]:{waterMl:0,cardioMinutes:0,notes:''}),...row});if(index>=0)metrics[index]=value;else metrics.push(value);imported++;}return {workspace:{...data,metrics},imported,skipped:rows.length-imported};
}
