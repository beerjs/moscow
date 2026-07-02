import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './styles.css';
import drinkupsRaw from './generated/drinkups.json';
import reportRaw from './generated/data-report.json';
import venuesRaw from './generated/venues.json';
import { drinkupTypeLabels, drinkupTypeOrder } from './copy';
import { applyFilters, defaultFilters, getAvailableVenues, getAvailableYears } from './filters';
import { initBeerMap, type BeerMap } from './map';
import type { DataReport, Drinkup, Filters, Venue } from './types';
import { compactDateLabel, createElement, formatYearRange, requireElement, setText } from './utils';

const drinkups = drinkupsRaw as Drinkup[];
const venues = venuesRaw as Venue[];
const report = reportRaw as DataReport;
const drinkupsById = new Map(drinkups.map((drinkup) => [drinkup.id, drinkup]));

const elements = {
  search: requireElement<HTMLInputElement>('#search-input'),
  year: requireElement<HTMLSelectElement>('#year-filter'),
  type: requireElement<HTMLSelectElement>('#type-filter'),
  venue: requireElement<HTMLSelectElement>('#venue-filter'),
  onlyCoordinates: requireElement<HTMLInputElement>('#coordinates-filter'),
  reset: requireElement<HTMLButtonElement>('#reset-filters'),
  list: requireElement<HTMLDivElement>('#drinkups-list'),
  emptyState: requireElement<HTMLDivElement>('#empty-state'),
  resultCount: requireElement<HTMLParagraphElement>('#result-count'),
  map: requireElement<HTMLDivElement>('#beer-map'),
  mapStatus: requireElement<HTMLParagraphElement>('#map-status'),
};

let filters: Filters = { ...defaultFilters };
let beerMap: BeerMap;

populateMetrics();
populateFilterOptions();
bindEvents();

beerMap = initBeerMap({
  container: elements.map,
  status: elements.mapStatus,
  venues,
  drinkupsById,
  onVenueRequest: (venue) => {
    filters = {
      ...filters,
      venue: venue.name,
      onlyWithCoordinates: false,
    };
    syncControls();
    render();
    document.querySelector('#drinkups')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
});

render();

function populateMetrics(): void {
  const years = drinkups.map((drinkup) => drinkup.year);
  setText('#metric-drinkups', String(report.summary.totalDrinkups));
  setText('#metric-venues', String(report.summary.uniqueVenuesOnMap));
  setText('#metric-years', formatYearRange(years));
}

function populateFilterOptions(): void {
  fillSelect(elements.year, 'Все годы', getAvailableYears(drinkups));
  fillSelect(
    elements.type,
    'Все типы',
    drinkupTypeOrder.filter((type) => drinkups.some((drinkup) => drinkup.type === type)),
    (type) => drinkupTypeLabels[type],
  );
  fillSelect(elements.venue, 'Все места', getAvailableVenues(drinkups));
}

function bindEvents(): void {
  elements.search.addEventListener('input', () => {
    filters.query = elements.search.value;
    render();
  });
  elements.year.addEventListener('change', () => {
    filters.year = elements.year.value;
    render();
  });
  elements.type.addEventListener('change', () => {
    filters.type = elements.type.value;
    render();
  });
  elements.venue.addEventListener('change', () => {
    filters.venue = elements.venue.value;
    render();
  });
  elements.onlyCoordinates.addEventListener('change', () => {
    filters.onlyWithCoordinates = elements.onlyCoordinates.checked;
    render();
  });
  elements.reset.addEventListener('click', resetFilters);

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reset-empty]')) {
    button.addEventListener('click', resetFilters);
  }
}

function render(): void {
  const filteredDrinkups = applyFilters(drinkups, filters);
  elements.resultCount.textContent = `Показано ${filteredDrinkups.length} из ${drinkups.length}`;
  renderDrinkups(filteredDrinkups);
  beerMap.update(filteredDrinkups);
}

function renderDrinkups(filteredDrinkups: Drinkup[]): void {
  elements.emptyState.hidden = filteredDrinkups.length > 0;

  const fragment = document.createDocumentFragment();
  for (const drinkup of filteredDrinkups) {
    fragment.append(createDrinkupCard(drinkup));
  }
  elements.list.replaceChildren(fragment);
}

function createDrinkupCard(drinkup: Drinkup): HTMLElement {
  const button = createElement('button', 'drinkup-card');
  button.type = 'button';
  button.dataset.drinkupId = String(drinkup.id);
  button.setAttribute(
    'aria-label',
    drinkup.coordinates
      ? `Показать на карте ${drinkup.bar}, ${compactDateLabel(drinkup.dateLabel)}`
      : `${drinkup.bar}, ${compactDateLabel(drinkup.dateLabel)}, без координат на карте`,
  );

  const top = createElement('span', 'drinkup-card-top');
  const id = createElement('span', 'drinkup-id');
  id.textContent = `#${drinkup.id}`;
  const date = createElement('span');
  date.textContent = compactDateLabel(drinkup.dateLabel);
  top.append(id, date);

  const title = createElement('strong');
  title.textContent = drinkup.bar;

  const meta = createElement('span', 'drinkup-meta');
  const locationParts = [...drinkup.subway, drinkup.address].filter(Boolean);
  meta.textContent = locationParts.length > 0 ? locationParts.join(' · ') : 'Адрес уточняется';

  const badges = createElement('span', 'drinkup-badges');
  const typeBadge = createElement('span', `badge badge-${drinkup.type}`);
  typeBadge.textContent = drinkupTypeLabels[drinkup.type];
  badges.append(typeBadge);

  if (drinkup.comment) {
    const comment = createElement('span', 'badge badge-comment');
    comment.textContent = drinkup.comment;
    badges.append(comment);
  }

  if (!drinkup.coordinates) {
    const noCoordinates = createElement('span', 'badge badge-muted');
    noCoordinates.textContent = 'Нет координат на карте';
    badges.append(noCoordinates);
  }

  button.append(top, title, meta, badges);
  button.addEventListener('click', () => beerMap.focusDrinkup(drinkup));
  return button;
}

function fillSelect<TValue extends string>(
  select: HTMLSelectElement,
  allLabel: string,
  values: TValue[],
  labelForValue: (value: TValue) => string = (value) => value,
): void {
  const options = [createOption('all', allLabel)];
  for (const value of values) {
    options.push(createOption(value, labelForValue(value)));
  }
  select.replaceChildren(...options);
}

function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function resetFilters(): void {
  filters = { ...defaultFilters };
  syncControls();
  render();
}

function syncControls(): void {
  elements.search.value = filters.query;
  elements.year.value = filters.year;
  elements.type.value = filters.type;
  elements.venue.value = filters.venue;
  elements.onlyCoordinates.checked = filters.onlyWithCoordinates;
}
