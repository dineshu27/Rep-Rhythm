import { describe, expect, it } from 'vitest';
import { foodSearchQuery, searchFoods } from './food-search';
import { nutritionFor } from './workspace';

describe('full USDA food catalogue search', () => {
  it('finds ingredients beyond the starter list and retains exact per-100-g values', () => {
    const result = searchFoods('bananas raw');
    expect(result.catalogueSize).toBeGreaterThan(13000);
    const banana = result.foods.find(food => food.id === 'usda-173944')!;
    expect(banana.name).toBe('Bananas, raw');
    expect(banana.per100g).toEqual({ calories: 89, protein: 1.09, fat: 0.33, carbs: 22.84, fiber: 2.6 });
    expect(nutritionFor(banana, 150).calories).toBe(133.5);
  });
  it.each(['biryani chicken', 'dosa plain', 'paneer', 'chicken curry'])('finds the prepared food %s', query => {
    const result = searchFoods(query);
    expect(result.total).toBeGreaterThan(0);
    expect(result.foods.every(food => food.source === 'estimated' && food.reference.includes('https://fdc.nal.usda.gov/food-details/'))).toBe(true);
  });
  it('matches preparation words rather than treating uncooked as cooked', () => {
    const result = searchFoods('rice cooked');
    expect(result.total).toBeGreaterThan(0);
    expect(result.foods.some(food => /uncooked/i.test(food.name))).toBe(false);
  });
  it('supports common UK food names and ignores connective words', () => {
    expect(searchFoods('aubergine').foods.map(food => food.id)).toEqual(searchFoods('eggplant').foods.map(food => food.id));
    expect(searchFoods('yoghurt').foods.map(food => food.id)).toEqual(searchFoods('yogurt').foods.map(food => food.id));
    expect(searchFoods('chicken with rice').foods.map(food => food.id)).toEqual(searchFoods('chicken rice').foods.map(food => food.id));
  });
  it('paginates deterministically without duplicate results and never invents missing foods', () => {
    const first = searchFoods('rice'); const second = searchFoods('rice', 2);
    expect(first.total).toBeGreaterThan(20); expect(first.foods).toHaveLength(20);
    expect(first.foods.some(food => second.foods.some(other => other.id === food.id))).toBe(false);
    expect(searchFoods('rice', 2)).toEqual(second);
    expect(searchFoods('zzzznonexistentfoodzzzz').foods).toEqual([]);
    expect(searchFoods('and with').total).toBe(0);
  });
  it('rejects empty, oversized and invalid searches', () => {
    for (const input of ['', 'a', ' ', '!!', 'x'.repeat(101)]) expect(foodSearchQuery.safeParse(input).success).toBe(false);
    expect(() => searchFoods('rice', 0)).toThrow();
  });
});
