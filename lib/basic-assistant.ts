import { type z } from 'zod';
import { aiRequestSchema, validateDraft, type AIDraft, type MatchedDraft } from './assistant';
import { searchFoods } from './food-search';
import { exerciseCatalogue } from './exercise-catalog';
const empty = (): AIDraft => ({ message: '', foods: [], exercises: [], tips: [] });
export function parseFoodText(text: string): AIDraft['foods'] {
  return text.replace(/\r/g,'').split(/[,;\n]+|\s+and\s+(?=\d)/i).map(chunk => chunk.trim()).filter(Boolean).slice(0,12).flatMap(chunk => {
    if ((chunk.match(/[-+]?\d+(?:\.\d+)?\s*(?:kg|kilograms?|g|grams?)\b/ig) ?? []).length > 1) return [];
    const weight = chunk.match(/([-+]?\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?)\b/i);
    const amount = weight ? Number(weight[1]) * (/^k/i.test(weight[2]) ? 1000 : 1) : null;
    const query = chunk.replace(/([-+]?\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?)\b/ig,' ').replace(/\b\d+(?:\.\d+)?\s*(?:ml|millilitres?|milliliters?|cups?|tbsp|tsp)\b/ig,' ').replace(/^(?:i\s+)?(?:ate|had|eat|log|add|please|my meal is)\s+/i,'').replace(/\s+(?:for|at)\s+(?:breakfast|lunch|dinner|snack)\b.*$/i,'').replace(/^\d+\s+(?:pieces?\s+of\s+)?/,'').replace(/\s+/g,' ').trim().slice(0,100);
    if (query.length < 2 || !/[\p{L}]/u.test(query)) return [];
    const grams = amount !== null && amount > 0 && amount <= 10000 ? amount : null;
    return [{ query, grams, note: grams === null ? 'Enter the weighed portion in grams. Counts, cups and millilitres are not converted automatically.' : 'Weight taken from your text. Check the selected food and its raw/cooked preparation.' }];
  });
}
export function basicDraft(input: z.infer<typeof aiRequestSchema>): MatchedDraft {
  const draft = empty();
  if (/sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/.test(input.description)) throw new Error('Use the secure key connection form, not chat.');
  if (input.mode === 'food') {
    let description = input.description;
    if (/^(?:make (?:it|that)|the portion was|it was|portion)?\s*\d+(?:\.\d+)?\s*(?:g|grams?|kg)\s*$/i.test(description)) {
      const previous = [...(input.history ?? [])].reverse().find(row => row.role === 'user');
      const parsed = previous ? parseFoodText(previous.content) : [];
      const food = parsed.length === 1 ? parsed[0] : null;
      const weight = description.match(/\d+(?:\.\d+)?\s*(?:kg|grams?|g)\b/i)?.[0];
      if (food && weight) description = `${weight} ${food.query}`;
      else return { ...empty(), message: 'Which food is that portion for? Include the food name with the grams so I do not apply it to the wrong item.', matches: [] };
    }
    draft.foods = parseFoodText(description);
    draft.message = draft.foods.length ? 'I found these food descriptions. Check each match and portion, then save the items you want. Nutrition comes from the selected food record.' : 'Try “150 g cooked rice, 100 g grilled chicken”. Separate foods with commas. I need a food name and weighed grams to prepare a log.';
  } else if (input.mode === 'workout') {
    if (/\b(pain|injur\w*|pregnan\w*|surgery|rehab\w*|hurt\w*|sore|arthritis|medical|doctor)\b/i.test(input.description)) draft.message = 'For pain, injury or medical limitations, ask a qualified professional about suitable exercise. I have not prepared an exercise plan.';
    else {
      const text = input.description.toLowerCase();
      if (/\b(?:no|without|avoid)\s+(?:dumbbells?|weights?|cables?)\b/i.test(text)) return { ...empty(), message: 'Tell me which equipment you do have, or ask for bodyweight movements. I have not selected exercises from excluded equipment.', matches: [] };
      const groups = ['Chest','Shoulders','Back','Legs','Biceps','Triceps','Core'].filter(group => text.includes(group.toLowerCase()) || text.includes(group.toLowerCase().replace(/s$/,'')) || (text.includes('upper') && ['Chest','Shoulders','Back','Biceps','Triceps'].includes(group)) || (text.includes('lower') && group === 'Legs'));
      const candidates = exerciseCatalogue.filter(row => groups.includes(row.muscle) && (!text.includes('dumbbell') || /dumbbell|goblet|plank/i.test(row.name)) && (!/bodyweight|no equipment/.test(text) || /push-up|plank|bodyweight/i.test(row.name)));
      draft.exercises = groups.flatMap(group => candidates.filter(row => row.muscle === group).slice(0,2)).slice(0,8).map(row => ({ presetId:row.id, rounds:2, amount:row.kind === 'seconds' ? 30 : 10, restSeconds:90, reason:'Basic catalogue starter, not a personalised training prescription. Check equipment, technique, volume and recovery.' }));
      draft.message = draft.exercises.length ? 'Here is an editable starter from the exercise library. Adjust the movements and targets before saving. Tell me the muscle groups and equipment for another selection.' : 'Which muscles and equipment do you want to use? Try “chest and shoulders with dumbbells”. The basic helper selects library exercises from explicit muscle groups.';
    }
  } else if (input.mode === 'meals') {
    if (/allerg\w*|intoleran\w*|coeliac|celiac|\b(?:no|without|avoid|free)\b/i.test(input.description)) draft.message = 'For allergies or intolerances, choose ingredients you know are safe and check package labels. Tell me the exact ingredients and weighed portions to log them; this basic helper cannot verify allergens.';
    else {
      const vegan = /vegan/i.test(input.description); const vegetarian = vegan || /vegetarian|veggie/i.test(input.description);
      const ingredients: [RegExp,string][] = [[/\brice\b/i,'rice cooked'],[/\beggs?\b/i,'egg cooked'],[/\bspinach\b/i,'spinach raw'],[/\bchicken\b/i,'chicken breast cooked'],[/\btofu\b/i,'tofu'],[/\boats?\b/i,'oats'],[/\bbanana\b/i,'banana raw'],[/\bbroccoli\b/i,'broccoli cooked'],[/\blentils?\b/i,'lentils cooked'],[/\bchickpeas?\b/i,'chickpeas cooked']];
      const mentioned = ingredients.filter(([pattern])=>pattern.test(input.description)).map(([,query])=>query);
      if ((vegan && mentioned.some(name=>/egg|chicken/.test(name))) || (vegetarian && mentioned.some(name=>/chicken/.test(name)))) return { ...empty(), message: 'The listed ingredients conflict with the requested diet. Choose suitable ingredients before planning a meal.', matches: [] };
      const names = mentioned.length ? mentioned.slice(0,4) : [vegan ? 'chickpeas cooked' : vegetarian ? 'egg cooked' : 'chicken breast cooked', 'rice cooked', 'broccoli cooked'];
      draft.foods = names.map(query => ({ query, grams:100, note:'Suggested 100 g portion for an editable meal idea, not inferred intake. Check food preparation and dietary suitability.' }));
      draft.message = 'A simple three-ingredient bowl to adapt. The portions below are suggestions: change them to suit your preferences. Saving adds a plan, not a food diary entry.';
    }
  } else {
    draft.message = 'Here is a basic reflection using only your recorded seven-day summary. Missing food days are unknown, and a logged day may be incomplete.';
    draft.tips = input.facts.slice(0,5).map(fact => ({ text:fact.value, factIds:[fact.id] }));
    if (!draft.tips.length) draft.message = 'Record some meals or completed workouts, then review your week. I do not have a recorded summary to analyse yet.';
  }
  const valid = validateDraft(draft, input);
  const matches = valid.foods.map(row => searchFoods(row.query).foods.slice(0,3));
  if (input.mode === 'food' && valid.foods.length && matches.every(rows=>!rows.length)) valid.message = 'No catalogue matches were found. Try shorter food names and comma-separated weighed portions, or choose a saved food in the review below.';
  return { ...valid, matches };
}
