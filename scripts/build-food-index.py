"""Build a compact per-100-g search index from official USDA downloads.

Example:
python3 scripts/build-food-index.py --sr /tmp/usda-sr-legacy.zip \
  --foundation /tmp/usda-foundation.zip --survey /tmp/usda-fndds.zip

Uses only standard-library modules. Missing required nutrients are never filled
with zero. Fiber may be unknown. Descriptions over the current record-name limit
are omitted rather than losing preparation details through truncation.
"""
import argparse
import csv
import io
import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sr', required=True)
    parser.add_argument('--foundation', required=True)
    parser.add_argument('--survey', required=True)
    parser.add_argument('--output', default='data')
    args = parser.parse_args()
    rows = {}
    omitted = Counter()

    def add(fdc_id, description, nutrients, source):
        name = ' '.join(description.split())
        if not 1 <= len(name) <= 150:
            omitted['name_length'] += 1
            return
        # Foundation foods may provide Atwater-specific/general energy instead
        # of the legacy Energy nutrient. All three are explicitly in kcal.
        energy = next((nutrients[key] for key in [2048, 2047, 1008] if key in nutrients), None)
        values = [energy, nutrients.get(1003), nutrients.get(1004), nutrients.get(1005), nutrients.get(1079)]
        if any(value is None for value in values[:4]):
            omitted['missing_core_nutrients'] += 1
            return
        for index, value in enumerate(values):
            if value is None:
                continue
            if not math.isfinite(value) or not 0 <= value <= (1000 if index == 0 else 100):
                omitted['invalid_nutrients'] += 1
                return
            value = round(float(value), 6)
            values[index] = int(value) if value.is_integer() else value
        rows[int(fdc_id)] = [int(fdc_id), name, *values, source]

    with ZipFile(args.sr) as archive:
        def csv_rows(filename):
            name = next(name for name in archive.namelist() if Path(name).name == filename)
            return csv.DictReader(io.TextIOWrapper(archive.open(name), encoding='utf-8-sig'))
        foods = {int(row['fdc_id']): row['description'] for row in csv_rows('food.csv')}
        nutrients = {}
        for row in csv_rows('food_nutrient.csv'):
            nutrient_id = int(row['nutrient_id'])
            if nutrient_id not in [1008, 1003, 1004, 1005, 1079]:
                continue
            try:
                amount = float(row['amount'])
            except (TypeError, ValueError):
                continue
            nutrients.setdefault(int(row['fdc_id']), {})[nutrient_id] = amount
        for fdc_id, name in foods.items():
            add(fdc_id, name, nutrients.get(fdc_id, {}), 'legacy')

    for path, key, source in [(args.foundation, 'FoundationFoods', 'foundation'), (args.survey, 'SurveyFoods', 'survey')]:
        with ZipFile(path) as archive:
            filename = next(name for name in archive.namelist() if name.endswith('.json'))
            foods = json.loads(archive.read(filename))[key]
        for food in foods:
            nutrients = {}
            for nutrient in food.get('foodNutrients', []):
                descriptor = nutrient.get('nutrient', {})
                nutrient_id = descriptor.get('id')
                if nutrient_id not in [1008, 2047, 2048, 1003, 1004, 1005, 1079]:
                    continue
                if nutrient_id in [1008, 2047, 2048] and descriptor.get('unitName', '').upper() != 'KCAL':
                    continue
                amount = nutrient.get('amount')
                if isinstance(amount, (int, float)) and not isinstance(amount, bool):
                    nutrients[nutrient_id] = amount
            add(food['fdcId'], food['description'], nutrients, source)

    ordered = [rows[key] for key in sorted(rows)]
    metadata = {
        'version': 1,
        'retrievedAt': datetime.now(timezone.utc).date().isoformat(),
        'count': len(ordered),
        'countsBySource': dict(Counter(row[-1] for row in ordered)),
        'omitted': dict(omitted),
        'sources': [
            {'id': 'legacy', 'label': 'USDA SR Legacy', 'release': '2018', 'url': 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_%202019-04-02.zip'},
            {'id': 'foundation', 'label': 'USDA Foundation', 'release': 'October 2026', 'url': 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-10-29.zip'},
            {'id': 'survey', 'label': 'USDA FNDDS 2021–2023', 'release': 'October 2024', 'url': 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip'},
        ],
    }
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    with (output / 'usda-food-index.json').open('w') as handle:
        handle.write('[\n')
        handle.write(',\n'.join(json.dumps(row, ensure_ascii=False, separators=(',', ':')) for row in ordered))
        handle.write('\n]\n')
    (output / 'usda-food-meta.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(metadata, ensure_ascii=False))


if __name__ == '__main__':
    main()
