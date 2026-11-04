import { foodSchema } from './workspace';
// USDA SR Legacy per-100-g values, retrieved 2026-11-04. Match the preparation state.
// These are general reference estimates, not a verified label for a specific product.
export const starterFoods = [
  {
    "id": "usda-171077",
    "name": "Chicken breast, skinless (raw)",
    "brand": "",
    "per100g": {
      "calories": 120.0,
      "protein": 22.5,
      "fat": 2.62,
      "carbs": 0.0,
      "fiber": 0.0
    },
    "source": "estimated",
    "reference": "USDA FoodData Central FDC 171077: https://fdc.nal.usda.gov/food-details/171077/nutrients"
  },
  {
    "id": "usda-168878",
    "name": "White long-grain rice (cooked)",
    "brand": "",
    "per100g": {
      "calories": 130.0,
      "protein": 2.69,
      "fat": 0.28,
      "carbs": 28.17,
      "fiber": 0.4
    },
    "source": "estimated",
    "reference": "USDA FoodData Central FDC 168878: https://fdc.nal.usda.gov/food-details/168878/nutrients"
  },
  {
    "id": "usda-173904",
    "name": "Oats (dry)",
    "brand": "",
    "per100g": {
      "calories": 379.0,
      "protein": 13.15,
      "fat": 6.52,
      "carbs": 67.7,
      "fiber": 10.1
    },
    "source": "estimated",
    "reference": "USDA FoodData Central FDC 173904: https://fdc.nal.usda.gov/food-details/173904/nutrients"
  },
  {
    "id": "usda-171688",
    "name": "Apple with skin (raw)",
    "brand": "",
    "per100g": {
      "calories": 52.0,
      "protein": 0.26,
      "fat": 0.17,
      "carbs": 13.81,
      "fiber": 2.4
    },
    "source": "estimated",
    "reference": "USDA FoodData Central FDC 171688: https://fdc.nal.usda.gov/food-details/171688/nutrients"
  },
  {
    "id": "usda-173757",
    "name": "Chickpeas (boiled, no salt)",
    "brand": "",
    "per100g": {
      "calories": 164.0,
      "protein": 8.86,
      "fat": 2.59,
      "carbs": 27.42,
      "fiber": 7.6
    },
    "source": "estimated",
    "reference": "USDA FoodData Central FDC 173757: https://fdc.nal.usda.gov/food-details/173757/nutrients"
  },
  {
    "id": "usda-173424",
    "name": "Whole egg (hard-boiled)",
    "brand": "",
    "per100g": {
      "calories": 155.0,
      "protein": 12.58,
      "fat": 10.61,
      "carbs": 1.12,
      "fiber": 0.0
    },
    "source": "estimated",
    "reference": "USDA FoodData Central FDC 173424: https://fdc.nal.usda.gov/food-details/173424/nutrients"
  },
  {
    "id": "usda-172421",
    "name": "Lentils (boiled, no salt)",
    "brand": "",
    "per100g": {
      "calories": 116.0,
      "protein": 9.02,
      "fat": 0.38,
      "carbs": 20.13,
      "fiber": 7.9
    },
    "source": "estimated",
    "reference": "USDA FoodData Central FDC 172421: https://fdc.nal.usda.gov/food-details/172421/nutrients"
  },
  {
    "id": "usda-170379",
    "name": "Broccoli (raw)",
    "brand": "",
    "per100g": {
      "calories": 34.0,
      "protein": 2.82,
      "fat": 0.37,
      "carbs": 6.64,
      "fiber": 2.6
    },
    "source": "estimated",
    "reference": "USDA FoodData Central FDC 170379: https://fdc.nal.usda.gov/food-details/170379/nutrients"
  }
].map(food => foodSchema.parse(food));
