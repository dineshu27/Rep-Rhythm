'use client';
import { useRef, useState, type FormEvent } from 'react';
import metadata from '@/data/usda-food-meta.json';
import { foodSchema, type FoodRecord } from '@/lib/workspace';
import { NutritionValues } from './nutrition-values';

type Results = { query: string; page: number; pageSize: number; total: number; foods: FoodRecord[] };
export function FoodSearch({ savedIds, onChoose }: { savedIds: string[]; onChoose: (food: FoodRecord) => boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef(0);
  async function search(value: string, page = 1) {
    const current = ++requestId.current;
    setBusy(true); setError(''); setNotice(''); setResults(null);
    try {
      const response = await fetch(`/api/foods/search?q=${encodeURIComponent(value.trim())}&page=${page}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Food search is temporarily unavailable.');
      const foods = foodSchema.array().parse(body.foods);
      if (current === requestId.current) setResults({ ...body, foods });
    } catch (err) {
      if (current === requestId.current) setError(err instanceof TypeError ? 'Search needs an internet connection. Your saved foods are still available below.' : err instanceof Error && err.name === 'Error' ? err.message : 'Food search is temporarily unavailable. Please try again.');
    } finally { if (current === requestId.current) setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); if (!busy) void search(query); }
  return <section className="workout-panel food-search" aria-label="Food search"><h2>Search all foods</h2><p className="workout-muted">Search {metadata.count.toLocaleString()} ingredients and prepared meals. Try banana, cooked rice, dosa, paneer, or chicken curry.</p>
    <form onSubmit={submit} className="workout-form food-search-form"><label>Search foods<input type="search" minLength={2} maxLength={100} required value={query} onChange={event => setQuery(event.target.value)} placeholder="Food name, ingredient, or dish"/></label><button className="shell-button" type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search foods'}</button></form>
    <p role="status" aria-label="Food search status">{busy ? 'Searching the food catalogue…' : results ? `${results.total.toLocaleString()} matches for “${results.query}”${results.total ? ` · Showing ${(results.page - 1) * results.pageSize + 1}–${Math.min(results.page * results.pageSize, results.total)}` : ''}` : notice}</p>
    {error && <p role="alert">{error}</p>}
    {results && !results.foods.length && <p className="workout-muted">No matching food was found. Try a shorter name or another preparation. For an exact product or recipe, use Add food below and enter its label values.</p>}
    <ul className="feature-records food-search-results" aria-label="Food search results">{results?.foods.map(food => <li key={food.id} data-food-id={food.id}><div><strong>{food.name}</strong><small>Reference estimate · per 100 g · {food.reference.split(': https:')[0]}</small><NutritionValues value={food.per100g}/><a className="shell-text-link" href={`https://fdc.nal.usda.gov/food-details/${food.id.replace('usda-', '')}/nutrients`} target="_blank" rel="noreferrer">View source ↗</a></div><div className="workout-actions"><button className="shell-button" onClick={() => { if (onChoose(food)) { setResults(null); setNotice(`${food.name} selected. Enter its portion in grams.`); } }}>{savedIds.includes(food.id) ? 'Use saved food' : 'Add and log food'}</button>{savedIds.includes(food.id) && <small>Uses your saved library values</small>}</div></li>)}</ul>
    {results && results.total > results.pageSize && <nav className="workout-actions" aria-label="Food search pages"><button className="shell-button shell-button-secondary" disabled={busy || results.page === 1} onClick={() => void search(results.query, results.page - 1)}>Previous results</button><button className="shell-button shell-button-secondary" disabled={busy || results.page * results.pageSize >= results.total} onClick={() => void search(results.query, results.page + 1)}>Next results</button></nav>}
    <p className="shell-fine-print">USDA FoodData Central reference data. Choose the matching raw/cooked preparation and check your package for branded products. Selected foods save to your library for offline tracking.</p>
  </section>;
}
