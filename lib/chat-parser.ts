import { parseFoodText } from './basic-assistant';
import { searchFoods } from './food-search';
import { starterFoods } from './food-catalog';
import { shiftDate } from './workspace';
import { exerciseMatches,normalizeLogName,type ChatRequest,type ExtractedChat,type ChatDraft } from './chat-tracking';
export function contextualText(input:ChatRequest){
 const short=/^(?:(?:it was|make it|actually|at|weight|bodyweight|unweighted)\s*)?(?:[-+]?\d+(?:\.\d+)?\s*(?:g|grams?|kg|reps?|sets?|seconds?)|bodyweight|unweighted|cooked|raw)\s*$/i.test(input.text.trim());
 if(!short||!input.pendingText)return input.text;
 const prior=input.pendingText;const parsed=parseTracking({...input,text:prior,pendingText:undefined});const foodOnly=parsed.foods.length===1&&parsed.exercises.length===0&&parsed.steps===null;const exerciseOnly=parsed.exercises.length===1&&parsed.foods.length===0&&parsed.steps===null;
 if(!foodOnly&&!exerciseOnly)return input.text;
 if(/\b(?:g|grams?|cooked|raw)\b/i.test(input.text)&&!foodOnly)return input.text;
 if(/\b(?:kg|bodyweight|unweighted|reps?|sets?|seconds?)\b/i.test(input.text)&&!exerciseOnly)return input.text;
 if(/\b(cooked|raw)\b/i.test(input.text))return `${prior.replace(/\b(?:raw|cooked)\b/gi,'')} ${input.text}`;
 if(/\b(?:bodyweight|unweighted)\b/i.test(input.text))return `${prior} unweighted`;
 if(/\bkg\b/i.test(input.text))return `${prior.replace(/[-+]?\d+(?:\.\d+)?\s*kg\b/ig,'')} ${input.text.replace(/^(?:it was|make it|actually|at|weight)\s*/i,'')}`;
 if(/\b(?:g|grams?)\b/i.test(input.text))return `${prior.replace(/[-+]?\d+(?:\.\d+)?\s*(?:g|grams?)\b/ig,'')} ${input.text.replace(/^(?:it was|make it|actually)\s*/i,'')}`;
 return `${prior} ${input.text}`;
}
export function parseTracking(input:ChatRequest):ExtractedChat{
 const text=contextualText(input).replace(/×/g,'x');if(/-\d+(?:\.\d+)?\s*(?:sets?|rounds?|reps?|repetitions?|seconds?|minutes?|kg)\b/i.test(text))throw Error('Negative exercise quantity');const question=/\?|\b(?:should|suggest|recommend|plan|tomorrow|will|going to|how many|how much|what should|can i|could i)\b/i.test(text)||/\b(?:didn.t|haven.t|not done|did not|have not)\b/i.test(text);
 let incomplete=false;const out:ExtractedChat={message:'',intent:question?'question':'log',foods:[],exercises:[],steps:null};
 const grouped=text.replace(/,\s*(?=\d+(?:\.\d+)?\s*(?:sets?|rounds?|reps?|repetitions?|kg|seconds?|sec|x)\b)/ig,' ');
 if(/^(?:hi|hello|hey|thanks|thank you|good morning|good evening)[!. ]*$/i.test(text.trim()))return {...out,intent:'question',message:'Hi! Tell me what you ate in grams or which exercises you completed. I’ll help put clear entries into your trackers.'};
 const chunks=grouped.split(/[;\n]+|\s+and\s+(?=(?:i\s+)?(?:did|ate|had|completed|trained|walked)\b)/i).flatMap(chunk=>chunk.split(/,(?!\d{3}\b)/)).map(chunk=>chunk.trim()).filter(Boolean);
 if(chunks.length>12)return {...out,intent:'question',message:'Please split this into messages with at most 12 food or exercise items so nothing is missed.'};
 for(const chunk of chunks){
  const step=chunk.match(/(?<![\w.])([-+]?\d[\d,]*)\s*steps?\b/i);if(step){const count=Number(step[1].replace(/,/g,''));if(out.steps!==null||/\d+(?:\.\d+)?\s*(?:g|grams?|kg|sets?|reps?)\b/i.test(chunk))incomplete=true;if(!Number.isInteger(count)||count<0||count>100000)throw Error('Invalid daily steps');out.steps=count;continue;}
  const cleaned=chunk.replace(/\b(?:today|yesterday|this morning|this evening|for breakfast|for lunch|for dinner)\b/ig,' ').trim();
  const exerciseLike=/\b(?:sets?|rounds?|reps?|repetitions?)\b|\d+\s*x\s*\d+/i.test(cleaned)||/^(?:i\s+)?(?:did|completed|trained|logged)\b/i.test(cleaned);
  if(exerciseLike){
   const times=cleaned.match(/\b(\d+)\s*x\s*(\d+)\b/i);const sets=cleaned.match(/\b(\d+)\s*(?:sets?|rounds?)\b/i);const reps=cleaned.match(/\b(\d+)\s*(?:reps?|repetitions?)\b/i);const seconds=cleaned.match(/\b(\d+)\s*(sec(?:onds?)?|s|minutes?|mins?)\b/i);const weight=cleaned.match(/([-+]?\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\b/i);const of=cleaned.match(/\b\d+\s*sets?\s+of\s+(\d+)\b/i);
   const query=cleaned.replace(/^(?:i\s+)?(?:did|completed|trained|logged)\s+/i,'').replace(/\b\d+\s*x\s*\d+\b/ig,'').replace(/\b\d+\s*sets?\s+of\s+\d+\b/ig,'').replace(/[-+]?\d+(?:\.\d+)?\s*(?:sets?|rounds?|reps?|repetitions?|kg|kilograms?|sec(?:onds?)?|s|minutes?|mins?)\b/ig,'').replace(/\b(?:at|with|of|each|reps?|repetitions?|bodyweight|unweighted|no weight)\b/ig,'').replace(/\s+/g,' ').trim().slice(0,100);
   if(query.length>=2)out.exercises.push({query,sets:sets?Number(sets[1]):times?Number(times[1]):null,amount:reps?Number(reps[1]):seconds?Number(seconds[1])*(/^min/i.test(seconds[2])?60:1):times?Number(times[2]):of?Number(of[1]):null,kind:seconds?'seconds':'reps',weightKg:weight?Number(weight[1]):/\b(?:bodyweight|unweighted|no weight)\b/i.test(cleaned)?0:null});else incomplete=true;
  }else {const foods=parseFoodText(cleaned);if(!foods.length||(cleaned.match(/[-+]?\d+(?:\.\d+)?\s*(?:kg|g|grams?)\b/ig)??[]).length>12)incomplete=true;out.foods.push(...foods);}
 }
 if(incomplete)return {...out,intent:'question',message:'I could not read every item, so nothing was logged. Separate foods with commas and describe each completed exercise with its sets, reps and kg.'};
 if(question&&input.summary){const summary=input.summary;out.message=`Your recorded day: ${Math.round(summary.calories)} kcal and ${Math.round(summary.protein)} g protein from ${summary.foods.length} listed food entries. ${summary.workouts.length} listed workouts. Steps: ${summary.steps===null?'not recorded':summary.steps.toLocaleString()}. ${summary.foods.length?'Foods: '+summary.foods.join('; ')+'.':''} Missing entries are unknown, not proof that you ate or did nothing.`;}
 else if(question)out.message='I’ll keep this as a question, not a log. For advice, connect your model key or use Planning & coaching. To record something, tell me what you ate or completed.';
 else if(!out.foods.length&&!out.exercises.length&&out.steps===null)out.message='Tell me a meal in grams or a completed exercise with sets, reps and kg. For example: “I ate 150 g cooked rice” or “I did barbell bench press, 3 sets of 10 at 20 kg”.';
 return out;
}
function matchFood(query:string){
 let search=query;let preferred:string|undefined;const normalized=normalizeLogName(query);
 if(/^(?:a )?bananas?(?: raw)?$/.test(normalized)) {search='banana raw';preferred='usda-173944';}
 else if(/^(?:white |long grain |white long grain )?rice cooked$|^cooked (?:white )?rice$/.test(normalized)){search='rice white long grain cooked';preferred='usda-168878';}
 else if(/^(?:raw chicken breast|chicken breast raw)$/.test(normalized)){preferred='usda-171077';search='chicken breast raw';}
 const candidates=searchFoods(search).foods.slice(0,5);const known=preferred?(starterFoods.find(row=>row.id===preferred)??candidates.find(row=>row.id===preferred)):undefined;
 const matches=known?[known,...candidates.filter(row=>row.id!==known.id)].slice(0,5):candidates;
 const confident=!!known||!!matches[0]&&matches.filter(row=>normalizeLogName(row.name)===normalized).length===1;
 return {food:matches[0]??null,matches,confident};
}
export function enrichTracking(extracted:ExtractedChat,input:ChatRequest):ChatDraft{
 const text=contextualText(input);let date=input.date;const explicit=text.match(/\b\d{4}-\d{2}-\d{2}\b/);if(explicit)date=explicit[0];else if(/\byesterday\b/i.test(text))date=shiftDate(input.today,-1);else if(/\btoday\b/i.test(text))date=input.today;
 let meal=input.meal;for(const category of ['Breakfast','Lunch','Dinner','Snack'] as const)if(new RegExp(`\\b${category}\\b`,'i').test(text))meal=category;
 const issues:string[]=[];const foods=extracted.foods.map(row=>{const match=matchFood(row.query);if(row.grams===null)issues.push(`How many grams of ${row.query}?`);if(!match.food)issues.push(`Choose a food match for ${row.query}.`);else if(!match.confident)issues.push(`Check the food and raw/cooked preparation for ${row.query}.`);return {...row,...match};});
 const exercises=extracted.exercises.map(row=>{const matches=exerciseMatches(row.query);const preset=matches.length===1?matches[0]:null;if(!preset)issues.push(`Which exercise is “${row.query}”? Choose a library match or confirm a custom exercise.`);if(row.sets===null)issues.push(`How many sets of ${row.query}?`);if(row.amount===null)issues.push(`How many ${row.kind==='seconds'?'seconds':'reps'} per set of ${row.query}?`);if(row.weightKg===null)issues.push(`What weight in kg for ${row.query}? Say “unweighted” if no load.`);if(preset&&preset.kind!==row.kind)issues.push(`Check whether ${row.query} is timed or counted in reps.`);return {...row,presetId:preset?.id??null,choices:matches.map(row=>row.id)};});
 if(extracted.steps!==null&&!/\b(?:today|total|daily|yesterday)\b/i.test(text))issues.push('Confirm this is your total step count for the selected day.');
 const dates=[...text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(row=>row[0]);const mixedDays=new Set(dates).size>1||/\btoday\b/i.test(text)&&/\byesterday\b/i.test(text);if(mixedDays)issues.push('Use a separate message for each day.');const intent=date>input.today||mixedDays?'question':extracted.intent;
 return {...extracted,sourceText:text.slice(0,4000),intent,date,meal,foods,exercises,issues,autoEligible:intent==='log'&&issues.length===0&&(foods.length>0||exercises.length>0||extracted.steps!==null),message:extracted.message|| (issues.length?issues[0]:'I’ve prepared your completed entries. Clear entries can be logged automatically; you can undo them from the receipt.')};
}
