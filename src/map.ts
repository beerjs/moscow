import L from 'leaflet';
import 'leaflet.markercluster';
import type { Drinkup, Venue } from './types';
import { compactDateLabel, createElement } from './utils';

type BeerMapOptions = {
  container: HTMLElement;
  status: HTMLElement;
  venues: Venue[];
  drinkupsById: Map<number, Drinkup>;
  onVenueRequest: (venue: Venue) => void;
};

export type BeerMap = {
  update: (drinkups: Drinkup[]) => void;
  focusDrinkup: (drinkup: Drinkup) => void;
};

const moscowCenter: L.LatLngExpression = [55.751244, 37.618423];

export function initBeerMap(options: BeerMapOptions): BeerMap {
  const map = L.map(options.container, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView(moscowCenter, 11);

  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  });

  tiles.on('tileerror', () => {
    options.status.textContent =
      'Карта временно не смогла загрузить тайлы OpenStreetMap. Список дринкапов продолжает работать.';
  });
  tiles.addTo(map);

  const clusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 42,
    spiderfyOnMaxZoom: true,
  });
  clusterGroup.addTo(map);

  const markerByVenueId = new Map<string, L.Marker>();
  const venueByDrinkupId = new Map<number, Venue>();

  for (const venue of options.venues) {
    for (const drinkupId of venue.drinkupIds) {
      venueByDrinkupId.set(drinkupId, venue);
    }

    const marker = L.marker([venue.coordinates.lat, venue.coordinates.lng], {
      icon: createBeerIcon(venue.drinkupCount),
      title: venue.name,
    });
    marker.bindPopup(createVenuePopup(venue, options.drinkupsById, options.onVenueRequest), {
      maxWidth: 320,
    });
    markerByVenueId.set(venue.id, marker);
  }

  function update(drinkups: Drinkup[]): void {
    const activeDrinkupIds = new Set(drinkups.map((drinkup) => drinkup.id));
    const activeVenues = options.venues.filter((venue) =>
      venue.drinkupIds.some((drinkupId) => activeDrinkupIds.has(drinkupId)),
    );

    clusterGroup.clearLayers();
    for (const venue of activeVenues) {
      const marker = markerByVenueId.get(venue.id);
      if (marker) {
        clusterGroup.addLayer(marker);
      }
    }

    if (activeVenues.length === 0) {
      options.status.textContent = 'По текущим фильтрам на карте нет мест с координатами.';
      map.setView(moscowCenter, 11);
      return;
    }

    options.status.textContent = `На карте показано мест: ${activeVenues.length}.`;
    const bounds = L.latLngBounds(
      activeVenues.map((venue) => [venue.coordinates.lat, venue.coordinates.lng]),
    );
    map.fitBounds(bounds.pad(0.18), {
      maxZoom: activeVenues.length === 1 ? 15 : 13,
      animate: false,
    });
    window.setTimeout(() => map.invalidateSize(), 0);
  }

  function focusDrinkup(drinkup: Drinkup): void {
    const venue = venueByDrinkupId.get(drinkup.id);
    if (!venue) {
      options.status.textContent = `У #${drinkup.id} нет координат на карте.`;
      return;
    }

    const marker = markerByVenueId.get(venue.id);
    if (!marker) {
      return;
    }

    map.setView([venue.coordinates.lat, venue.coordinates.lng], 15, { animate: true });
    clusterGroup.zoomToShowLayer(marker, () => {
      marker.openPopup();
    });
  }

  window.setTimeout(() => map.invalidateSize(), 0);

  return {
    update,
    focusDrinkup,
  };
}

function createBeerIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: 'beer-marker',
    html: `<span>JS</span><small>${count}</small>`,
    iconSize: [44, 54],
    iconAnchor: [22, 52],
    popupAnchor: [0, -48],
  });
}

function createVenuePopup(
  venue: Venue,
  drinkupsById: Map<number, Drinkup>,
  onVenueRequest: (venue: Venue) => void,
): HTMLElement {
  const wrapper = createElement('div', 'venue-popup');
  const title = createElement('strong');
  title.textContent = venue.name;
  wrapper.append(title);

  if (venue.address) {
    const address = createElement('span');
    address.textContent = venue.address;
    wrapper.append(address);
  }

  if (venue.subway.length > 0) {
    const subway = createElement('span');
    subway.textContent = venue.subway.join(', ');
    wrapper.append(subway);
  }

  const count = createElement('span');
  count.textContent = `${venue.drinkupCount} drinkups`;
  wrapper.append(count);

  const lastDrinkup = drinkupsById.get(venue.drinkupIds[0]);
  if (lastDrinkup) {
    const last = createElement('span');
    last.textContent = `Последний раз: ${compactDateLabel(lastDrinkup.dateLabel)}`;
    wrapper.append(last);
  }

  const recent = createElement('ul');
  for (const drinkupId of venue.drinkupIds.slice(0, 4)) {
    const drinkup = drinkupsById.get(drinkupId);
    if (!drinkup) {
      continue;
    }
    const item = createElement('li');
    item.textContent = `#${drinkup.id} · ${compactDateLabel(drinkup.dateLabel)}`;
    recent.append(item);
  }
  wrapper.append(recent);

  const button = createElement('button');
  button.type = 'button';
  button.textContent = 'Показать в списке';
  button.addEventListener('click', () => onVenueRequest(venue));
  wrapper.append(button);

  return wrapper;
}
