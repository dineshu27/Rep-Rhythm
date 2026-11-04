# Food-search index

The app indexes 13,585 foods from official [USDA FoodData Central downloads](https://fdc.nal.usda.gov/download-datasets/):

| Dataset | Release | Included records |
| --- | --- | --- |
| SR Legacy | 2018, April 2019 archive | 7,793 |
| Foundation Foods | October 2026 | 364 |
| FNDDS survey foods 2021–2023 | October 2024 | 5,428 |

Retrieved 4 November 2026. Exact source archives are listed in `usda-food-meta.json`. The compact index stays on the server; only selected search results are sent to the browser. No account, paid API, or external search provider is required. Individual results retain the FoodData Central identifier and source link.

## Data handling

Rows contain FDC id, exact description, kcal/protein/fat/carbs/fiber per 100 g, and dataset identifier. All core nutrient values must be present and within supported bounds. Missing fiber is `null`, not zero. Foods with missing core values, invalid numeric values, or descriptions longer than the current 150-character food-name limit are omitted. Metadata records those omissions. No macro or calorie values are invented to complete a record.

Foundation energy uses the provided Atwater-specific kcal value where available, then general kcal, then legacy Energy kcal. Data for raw, cooked, dry and prepared foods remains distinct. Reference values do not guarantee an exact branded product or recipe; users can enter label values separately.

## Rebuild

Download the three archives named in `usda-food-meta.json`, then run:

```sh
python3 scripts/build-food-index.py --sr /path/to/sr.zip --foundation /path/to/foundation.zip --survey /path/to/survey.zip
```

Review the count/provenance changes, run the unit and browser checks, and bump the offline-shell cache revision before releasing updated source data. The search API is public, read-only, bounded to 20 results per page, and caches only public nutrient data. Account endpoints continue to require authentication.
