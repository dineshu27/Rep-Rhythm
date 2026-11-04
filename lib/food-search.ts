import { z } from 'zod';
import rawIndex from '../data/usda-food-index.json';
import metadata from '../data/usda-food-meta.json';
import { foodSchema, type FoodRecord } from './workspace';

const rowSchema = z.tuple([
  z.number().int().positive(), z.string().min(1).max(150),
  z.number().min(0).max(1000), z.number().min(0).max(100), z.number().min(0).max(100), z.number().min(0).max(100), z.number().min(0).max(100).nullable(),
  z.enum(['legacy', 'foundation', 'survey']),
]);
const rows = z.array(rowSchema).parse(rawIndex);
const sources = Object.fromEntries(metadata.sources.map(source => [source.id, source.label]));
export const FOOD_SEARCH_SIZE = 20;
export const foodSearchQuery = z.string().trim().min(2).max(100).refine(value => /[\p{L}\p{N}]/u.test(value), 'Enter a food name.');
const aliases: Record<string, string> = { aubergine: 'eggplant', aubergines: 'eggplant', brinjal: 'eggplant', courgette: 'zucchini', courgettes: 'zucchini', yoghurt: 'yogurt', yoghurts: 'yogurt', capsicum: 'pepper', bhindi: 'okra', rajma: 'kidney', tomatoes: 'tomato', potatoes: 'potato' };
const stopWords = new Set(['and', 'with', 'the', 'of', 'in', 'a', 'an']);
function normalize(value: string) { return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
const indexed = rows.map(row => ({ row, name: normalize(row[1]), words: normalize(row[1]).split(' ') }));
function record(row: z.infer<typeof rowSchema>): FoodRecord {
  return foodSchema.parse({ id: `usda-${row[0]}`, name: row[1], brand: '', per100g: { calories: row[2], protein: row[3], fat: row[4], carbs: row[5], fiber: row[6] }, source: 'estimated', reference: `${sources[row[7]]}, FDC ${row[0]}: https://fdc.nal.usda.gov/food-details/${row[0]}/nutrients` });
}
export function searchFoods(input: string, page = 1) {
  const query = foodSearchQuery.parse(input);
  z.number().int().min(1).max(1000).parse(page);
  const terms = normalize(query).split(' ').filter(term => !stopWords.has(term)).map(term => aliases[term] ?? term);
  const matches = terms.length ? indexed.flatMap(item => {
    const found = terms.every(term => item.words.some(word => word.startsWith(term) || (term.length > 3 && term.endsWith('s') && word.startsWith(term.slice(0, -1)))));
    if (!found) return [];
    const score = (item.name.startsWith(terms.join(' ')) ? 100 : 0) + terms.filter(term => item.words.some(word => word === term || word === term + 's')).length * 10 + Math.max(0, 30 - item.words.length) + (item.row[7] === 'foundation' ? 2 : 0);
    return [{ ...item, score }];
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.row[0] - b.row[0]) : [];
  return { query, page, pageSize: FOOD_SEARCH_SIZE, total: matches.length, catalogueSize: rows.length, foods: matches.slice((page - 1) * FOOD_SEARCH_SIZE, page * FOOD_SEARCH_SIZE).map(item => record(item.row)) };
}
