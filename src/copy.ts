import type { DrinkupType } from './types';

export const telegramUrl = 'https://telegram.me/beerjs_moscow';

export const drinkupTypeLabels: Record<DrinkupType, string> = {
  regular: 'Regular',
  'beerjs-drinkup': 'BeerJS Drinkup',
  'moscowjs-afterparty': 'MoscowJS afterparty',
  'moscowcss-afterparty': 'MoscowCSS afterparty',
  'vue-afterparty': 'Vue afterparty',
  cocktailjs: 'CocktailJS',
  other: 'Other',
};

export const drinkupTypeOrder: DrinkupType[] = [
  'regular',
  'beerjs-drinkup',
  'moscowjs-afterparty',
  'moscowcss-afterparty',
  'vue-afterparty',
  'cocktailjs',
  'other',
];
