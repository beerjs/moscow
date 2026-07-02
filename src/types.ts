export type DrinkupType =
  | 'regular'
  | 'beerjs-drinkup'
  | 'moscowjs-afterparty'
  | 'moscowcss-afterparty'
  | 'vue-afterparty'
  | 'cocktailjs'
  | 'other';

export type Coordinates = {
  lat: number;
  lng: number;
};

export type Drinkup = {
  id: number;
  title: string;
  dateISO: string;
  dateLabel: string;
  year: number;
  bar: string;
  comment: string | null;
  subway: string[];
  address: string | null;
  coordinates: Coordinates | null;
  type: DrinkupType;
  searchableText: string;
};

export type Venue = {
  id: string;
  name: string;
  address: string | null;
  subway: string[];
  coordinates: Coordinates;
  drinkupIds: number[];
  drinkupCount: number;
  firstDateISO: string;
  lastDateISO: string;
  types: DrinkupType[];
};

export type DataReport = {
  summary: {
    totalDrinkups: number;
    drinkupsWithCoordinates: number;
    drinkupsWithoutCoordinates: number;
    uniqueVenuesOnMap: number;
    dateRange: {
      first: string;
      last: string;
    };
  };
  drinkupsWithoutCoordinates: Array<{
    id: number;
    dateISO: string;
    bar: string;
    address: string | null;
    subway: string[];
    comment: string | null;
  }>;
  barsWithMultipleCoordinates: Array<{
    bar: string;
    variants: string[];
  }>;
  suspiciousCoordinates: Array<{
    id: number;
    dateISO: string;
    bar: string;
    coordinates: Coordinates;
    reason: string;
  }>;
  emptyAddress: Array<{
    id: number;
    dateISO: string;
    bar: string;
    subway: string[];
  }>;
};

export type Filters = {
  query: string;
  year: string;
  type: string;
  venue: string;
  onlyWithCoordinates: boolean;
};
