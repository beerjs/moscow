import type { Drinkup, Filters } from './types';
import { uniqueSorted } from './utils';

export const defaultFilters: Filters = {
  query: '',
  year: 'all',
  type: 'all',
  venue: 'all',
  onlyWithCoordinates: false,
};

export function applyFilters(drinkups: Drinkup[], filters: Filters): Drinkup[] {
  const query = filters.query.trim().toLowerCase();

  return drinkups.filter((drinkup) => {
    if (query && !drinkup.searchableText.includes(query)) {
      return false;
    }

    if (filters.year !== 'all' && String(drinkup.year) !== filters.year) {
      return false;
    }

    if (filters.type !== 'all' && drinkup.type !== filters.type) {
      return false;
    }

    if (filters.venue !== 'all' && drinkup.bar !== filters.venue) {
      return false;
    }

    if (filters.onlyWithCoordinates && !drinkup.coordinates) {
      return false;
    }

    return true;
  });
}

export function getAvailableYears(drinkups: Drinkup[]): string[] {
  return Array.from(new Set(drinkups.map((drinkup) => drinkup.year)))
    .sort((left, right) => right - left)
    .map(String);
}

export function getAvailableVenues(drinkups: Drinkup[]): string[] {
  return uniqueSorted(drinkups.map((drinkup) => drinkup.bar));
}
