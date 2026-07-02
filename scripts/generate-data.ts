import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import type { DataReport, Drinkup, DrinkupType, Venue } from '../src/types';

type RawDrinkupRow = {
  date?: string;
  ID?: string;
  Calculation?: string;
  bar?: string;
  comment?: string;
  subway?: string;
  address?: string;
  coordinates?: string;
  Заголовок?: string;
};

type GeneratedData = {
  drinkups: Drinkup[];
  venues: Venue[];
  report: DataReport;
  reportMarkdown: string;
};

type DrinkupWithCoordinates = Drinkup & { coordinates: NonNullable<Drinkup['coordinates']> };

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredColumns = [
  'date',
  'ID',
  'Calculation',
  'bar',
  'comment',
  'subway',
  'address',
  'coordinates',
  'Заголовок',
];

export function detectDrinkupType(comment: string | null, title: string): DrinkupType {
  const text = `${comment ?? ''} ${title}`.toLowerCase();

  if (text.includes('cocktailjs')) {
    return 'cocktailjs';
  }
  if (text.includes('vue') || text.includes('msk vue')) {
    return 'vue-afterparty';
  }
  if (text.includes('moscowcss')) {
    return 'moscowcss-afterparty';
  }
  if (text.includes('moscowjs')) {
    return 'moscowjs-afterparty';
  }
  if (
    text.includes('beerjs drinkup') ||
    text.includes('moscow drinkup') ||
    text.includes('drinkup #')
  ) {
    return 'beerjs-drinkup';
  }
  if (!comment) {
    return 'regular';
  }
  return 'other';
}

export function parseCoordinates(value: string | undefined, rowLabel: string): Drinkup['coordinates'] {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new Error(`${rowLabel}: coordinates "${trimmed}" must be "lat, lng"`);
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error(`${rowLabel}: latitude "${match[1]}" is outside -90..90`);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error(`${rowLabel}: longitude "${match[2]}" is outside -180..180`);
  }

  return { lat, lng };
}

export function generateDataFromCsv(csvContent: string): GeneratedData {
  const rows = parse(csvContent, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: false,
  }) as RawDrinkupRow[];

  validateHeader(rows);

  const errors: string[] = [];
  const seenIds = new Set<number>();
  const drinkups: Drinkup[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowLabel = `row ${rowNumber}`;
    const rawId = trimCell(row.ID);
    const rawDateISO = trimCell(row.Calculation);
    const bar = trimCell(row.bar);

    if (!rawId) {
      errors.push(`${rowLabel}: empty ID`);
      return;
    }

    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      errors.push(`${rowLabel}: ID "${rawId}" is not a number`);
      return;
    }

    if (seenIds.has(id)) {
      errors.push(`${rowLabel}: duplicate ID ${id}`);
      return;
    }
    seenIds.add(id);

    if (!rawDateISO) {
      errors.push(`${rowLabel}: empty Calculation`);
      return;
    }

    if (!isValidIsoDate(rawDateISO)) {
      errors.push(`${rowLabel}: Calculation "${rawDateISO}" is not a valid YYYY-MM-DD date`);
      return;
    }

    if (!bar) {
      errors.push(`${rowLabel}: empty bar`);
      return;
    }

    let coordinates: Drinkup['coordinates'];
    try {
      coordinates = parseCoordinates(row.coordinates, `ID ${id}`);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return;
    }

    const comment = nullIfEmpty(row.comment);
    const dateLabel = trimCell(row.date) || formatDateLabel(rawDateISO);
    const title = trimCell(row.Заголовок) || `${dateLabel}, ${bar}`;
    const subway = splitSubway(row.subway);
    const address = nullIfEmpty(row.address);
    const type = detectDrinkupType(comment, title);

    drinkups.push({
      id,
      title,
      dateISO: rawDateISO,
      dateLabel,
      year: Number(rawDateISO.slice(0, 4)),
      bar,
      comment,
      subway,
      address,
      coordinates,
      type,
      searchableText: buildSearchableText({
        id,
        title,
        dateISO: rawDateISO,
        dateLabel,
        bar,
        comment,
        subway,
        address,
      }),
    });
  });

  if (errors.length > 0) {
    throw new Error(`CSV validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  const sortedDrinkups = [...drinkups].sort((left, right) => {
    const byDate = right.dateISO.localeCompare(left.dateISO);
    return byDate === 0 ? right.id - left.id : byDate;
  });
  const venues = buildVenues(sortedDrinkups);
  const report = buildReport(sortedDrinkups, venues);
  const reportMarkdown = buildReportMarkdown(report);

  return {
    drinkups: sortedDrinkups,
    venues,
    report,
    reportMarkdown,
  };
}

async function main(): Promise<void> {
  const csvPath = resolve(rootDir, 'data/drinkups-base.csv');
  const csvContent = await readFile(csvPath, 'utf8');
  const generated = generateDataFromCsv(csvContent);

  await writeJson(resolve(rootDir, 'src/generated/drinkups.json'), generated.drinkups);
  await writeJson(resolve(rootDir, 'src/generated/venues.json'), generated.venues);
  await writeJson(resolve(rootDir, 'src/generated/data-report.json'), generated.report);
  await writeText(resolve(rootDir, 'docs/data-report.md'), generated.reportMarkdown);

  console.log(
    `Generated ${generated.drinkups.length} drinkups and ${generated.venues.length} venues from ${csvPath}`,
  );
}

function validateHeader(rows: RawDrinkupRow[]): void {
  const firstRow = rows[0];
  if (!firstRow) {
    throw new Error('CSV is empty');
  }

  const columns = Object.keys(firstRow);
  const missing = requiredColumns.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    throw new Error(`CSV is missing required columns: ${missing.join(', ')}`);
  }
}

function buildVenues(drinkups: Drinkup[]): Venue[] {
  const venueGroups = new Map<string, DrinkupWithCoordinates[]>();

  for (const drinkup of drinkups) {
    if (!hasCoordinates(drinkup)) {
      continue;
    }

    const key = buildVenueKey(drinkup);
    const group = venueGroups.get(key) ?? [];
    group.push(drinkup);
    venueGroups.set(key, group);
  }

  return Array.from(venueGroups.entries())
    .map(([key, group]) => {
      const sorted = [...group].sort((left, right) => {
        const byDate = right.dateISO.localeCompare(left.dateISO);
        return byDate === 0 ? right.id - left.id : byDate;
      });
      const first = sorted[sorted.length - 1];
      const last = sorted[0];

      return {
        id: buildVenueId(key, last.bar),
        name: last.bar,
        address: last.address,
        subway: uniqueStrings(sorted.flatMap((drinkup) => drinkup.subway)),
        coordinates: last.coordinates,
        drinkupIds: sorted.map((drinkup) => drinkup.id),
        drinkupCount: sorted.length,
        firstDateISO: first.dateISO,
        lastDateISO: last.dateISO,
        types: uniqueTypes(sorted.map((drinkup) => drinkup.type)),
      };
    })
    .sort((left, right) => {
      const byDate = right.lastDateISO.localeCompare(left.lastDateISO);
      return byDate === 0 ? left.name.localeCompare(right.name, 'ru') : byDate;
    });
}

function buildReport(drinkups: Drinkup[], venues: Venue[]): DataReport {
  const withCoordinates = drinkups.filter(hasCoordinates);
  const dateValues = drinkups.map((drinkup) => drinkup.dateISO).sort();

  return {
    summary: {
      totalDrinkups: drinkups.length,
      drinkupsWithCoordinates: withCoordinates.length,
      drinkupsWithoutCoordinates: drinkups.length - withCoordinates.length,
      uniqueVenuesOnMap: venues.length,
      dateRange: {
        first: dateValues[0] ?? '',
        last: dateValues[dateValues.length - 1] ?? '',
      },
    },
    drinkupsWithoutCoordinates: drinkups
      .filter((drinkup) => !drinkup.coordinates)
      .map((drinkup) => ({
        id: drinkup.id,
        dateISO: drinkup.dateISO,
        bar: drinkup.bar,
        address: drinkup.address,
        subway: drinkup.subway,
        comment: drinkup.comment,
      })),
    barsWithMultipleCoordinates: findBarsWithMultipleCoordinates(drinkups),
    suspiciousCoordinates: withCoordinates
      .filter((drinkup) => isSuspiciousMoscowCoordinate(drinkup.coordinates))
      .map((drinkup) => ({
        id: drinkup.id,
        dateISO: drinkup.dateISO,
        bar: drinkup.bar,
        coordinates: drinkup.coordinates,
        reason: 'Outside broad Moscow bounding box',
      })),
    emptyAddress: drinkups
      .filter((drinkup) => !drinkup.address)
      .map((drinkup) => ({
        id: drinkup.id,
        dateISO: drinkup.dateISO,
        bar: drinkup.bar,
        subway: drinkup.subway,
      })),
  };
}

function hasCoordinates(
  drinkup: Drinkup,
): drinkup is DrinkupWithCoordinates {
  return drinkup.coordinates !== null;
}

function buildReportMarkdown(report: DataReport): string {
  return [
    '# BeerJS Moscow data report',
    '',
    '## Summary',
    `- Total drinkups: ${report.summary.totalDrinkups}`,
    `- Drinkups with coordinates: ${report.summary.drinkupsWithCoordinates}`,
    `- Drinkups without coordinates: ${report.summary.drinkupsWithoutCoordinates}`,
    `- Unique venues on map: ${report.summary.uniqueVenuesOnMap}`,
    `- Date range: ${report.summary.dateRange.first} - ${report.summary.dateRange.last}`,
    '',
    '## Drinkups without coordinates',
    table(
      ['ID', 'Date', 'Bar', 'Address', 'Subway', 'Comment'],
      report.drinkupsWithoutCoordinates.map((item) => [
        String(item.id),
        item.dateISO,
        item.bar,
        item.address ?? '',
        item.subway.join(', '),
        item.comment ?? '',
      ]),
    ),
    '',
    '## Bars with multiple coordinates',
    table(
      ['Bar', 'Variants'],
      report.barsWithMultipleCoordinates.map((item) => [item.bar, item.variants.join('; ')]),
    ),
    '',
    '## Suspicious coordinates',
    table(
      ['ID', 'Date', 'Bar', 'Coordinates', 'Reason'],
      report.suspiciousCoordinates.map((item) => [
        String(item.id),
        item.dateISO,
        item.bar,
        `${item.coordinates.lat}, ${item.coordinates.lng}`,
        item.reason,
      ]),
    ),
    '',
    '## Empty address',
    table(
      ['ID', 'Date', 'Bar', 'Subway'],
      report.emptyAddress.map((item) => [
        String(item.id),
        item.dateISO,
        item.bar,
        item.subway.join(', '),
      ]),
    ),
    '',
  ].join('\n');
}

function findBarsWithMultipleCoordinates(drinkups: Drinkup[]): DataReport['barsWithMultipleCoordinates'] {
  const bars = new Map<string, { bar: string; variants: Set<string> }>();

  for (const drinkup of drinkups) {
    if (!drinkup.coordinates) {
      continue;
    }

    const key = normalize(drinkup.bar);
    const existing = bars.get(key) ?? { bar: drinkup.bar, variants: new Set<string>() };
    existing.variants.add(
      `${drinkup.address ?? 'no address'} (${drinkup.coordinates.lat}, ${drinkup.coordinates.lng})`,
    );
    bars.set(key, existing);
  }

  return Array.from(bars.values())
    .filter((item) => item.variants.size > 1)
    .map((item) => ({
      bar: item.bar,
      variants: Array.from(item.variants).sort((left, right) => left.localeCompare(right, 'ru')),
    }))
    .sort((left, right) => left.bar.localeCompare(right.bar, 'ru'));
}

function isSuspiciousMoscowCoordinate(coordinates: NonNullable<Drinkup['coordinates']>): boolean {
  return (
    coordinates.lat < 55.35 ||
    coordinates.lat > 56.05 ||
    coordinates.lng < 36.8 ||
    coordinates.lng > 38.3
  );
}

function buildVenueKey(drinkup: Drinkup): string {
  const locationKey = drinkup.address
    ? normalize(drinkup.address)
    : `${drinkup.coordinates?.lat.toFixed(6)},${drinkup.coordinates?.lng.toFixed(6)}`;
  return `${normalize(drinkup.bar)}|${locationKey}`;
}

function buildVenueId(key: string, bar: string): string {
  const slug = normalize(bar)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 10);
  return `${slug || 'venue'}-${hash}`;
}

function buildSearchableText(input: {
  id: number;
  title: string;
  dateISO: string;
  dateLabel: string;
  bar: string;
  comment: string | null;
  subway: string[];
  address: string | null;
}): string {
  return [
    String(input.id),
    `#${input.id}`,
    input.title,
    input.dateISO,
    input.dateLabel,
    input.bar,
    input.comment,
    ...input.subway,
    input.address,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function splitSubway(value: string | undefined): string[] {
  return uniqueStrings(
    (value ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, 'ru'));
}

function uniqueTypes(values: DrinkupType[]): DrinkupType[] {
  return Array.from(new Set(values));
}

function nullIfEmpty(value: string | undefined): string | null {
  const trimmed = trimCell(value);
  return trimmed ? trimmed : null;
}

function trimCell(value: string | undefined): string {
  return (value ?? '').trim();
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const months = [
    'Января',
    'Февраля',
    'Марта',
    'Апреля',
    'Мая',
    'Июня',
    'Июля',
    'Августа',
    'Сентября',
    'Октября',
    'Ноября',
    'Декабря',
  ];
  return `${day} ${months[month - 1]} ${year} г.`;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}

function table(headers: string[], rows: string[][]): string {
  const safeHeaders = headers.map(escapeMarkdownCell);
  const safeRows = rows.map((row) => row.map(escapeMarkdownCell));

  return [
    `| ${safeHeaders.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...(safeRows.length > 0 ? safeRows : [['No rows', ...headers.slice(1).map(() => '')]]).map(
      (row) => `| ${row.join(' | ')} |`,
    ),
  ].join('\n');
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim();
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await writeText(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
