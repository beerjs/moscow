import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectDrinkupType, generateDataFromCsv, parseCoordinates } from '../scripts/generate-data';

const fixturePath = resolve(fileURLToPath(new URL('.', import.meta.url)), 'fixtures/drinkups-sample.csv');

describe('generateDataFromCsv', () => {
  it('parses CSV with multiline comments as a single row', () => {
    const data = generateDataFromCsv(readFileSync(fixturePath, 'utf8'));

    expect(data.drinkups).toHaveLength(4);
    expect(data.drinkups.find((drinkup) => drinkup.id === 187)?.comment).toBe(
      'Афтепати MoscowJS 69',
    );
  });

  it('keeps empty coordinates as null and excludes them from venues', () => {
    const data = generateDataFromCsv(readFileSync(fixturePath, 'utf8'));
    const withoutCoordinates = data.drinkups.find((drinkup) => drinkup.id === 191);

    expect(withoutCoordinates?.coordinates).toBeNull();
    expect(data.venues.flatMap((venue) => venue.drinkupIds)).not.toContain(191);
    expect(data.report.summary.drinkupsWithoutCoordinates).toBe(1);
  });

  it('parses valid coordinates', () => {
    expect(parseCoordinates('55.769237, 37.620841', 'test')).toEqual({
      lat: 55.769237,
      lng: 37.620841,
    });
  });

  it('throws on invalid coordinates', () => {
    expect(() =>
      generateDataFromCsv(
        [
          'date,ID,Calculation,bar,comment,subway,address,coordinates,Заголовок',
          '2 Июля 2026 г.,201,2026-07-02,Варка,,Цветной бульвар,"Цветной бульвар, 7с1",abc,"02 Июля 2026, Варка"',
        ].join('\n'),
      ),
    ).toThrow(/coordinates/);
  });

  it('throws on duplicate IDs', () => {
    expect(() =>
      generateDataFromCsv(
        [
          'date,ID,Calculation,bar,comment,subway,address,coordinates,Заголовок',
          '2 Июля 2026 г.,201,2026-07-02,Варка,,Цветной бульвар,"Цветной бульвар, 7с1","55.769237, 37.620841","02 Июля 2026, Варка"',
          '9 Июля 2026 г.,201,2026-07-09,Støy!,,Добрынинская,"Валовая улица, 30","55.730210, 37.626558","09 Июля 2026, Støy!"',
        ].join('\n'),
      ),
    ).toThrow(/duplicate ID 201/);
  });

  it('aggregates venue drinkups by normalized bar and address', () => {
    const data = generateDataFromCsv(
      [
        'date,ID,Calculation,bar,comment,subway,address,coordinates,Заголовок',
        '2 Июля 2026 г.,201,2026-07-02,Варка,,Цветной бульвар,"Цветной бульвар, 7с1","55.769237, 37.620841","02 Июля 2026, Варка"',
        '3 Октября 2024 г.,155,2024-10-03,Варка,,Цветной бульвар,"Цветной бульвар, 7с1","55.769237, 37.620841","03 Октября 2024, Варка"',
      ].join('\n'),
    );

    expect(data.venues).toHaveLength(1);
    expect(data.venues[0].drinkupIds).toEqual([201, 155]);
    expect(data.venues[0].firstDateISO).toBe('2024-10-03');
    expect(data.venues[0].lastDateISO).toBe('2026-07-02');
  });
});

describe('detectDrinkupType', () => {
  it.each([
    ['CocktailJS', 'cocktailjs'],
    ['Афтепати MSK VUE.JS', 'vue-afterparty'],
    ['Афтепати MoscowCSS', 'moscowcss-afterparty'],
    ['Афтепати MoscowJS 71', 'moscowjs-afterparty'],
    ['BeerJS Drinkup #1', 'beerjs-drinkup'],
    ['', 'regular'],
    ['Ребята собрались и никому не сказали', 'other'],
  ] as const)('detects %s as %s', (comment, expectedType) => {
    expect(detectDrinkupType(comment || null, 'Sample title')).toBe(expectedType);
  });
});
