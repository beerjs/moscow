# BeerJS Moscow website

Static one-page website for BeerJS Moscow drinkups.

Production is built with Vite and TypeScript. There is no Express runtime and no Airtable
request during production build. Airtable is only the upstream source for manually exported
CSV data.

## Development

```bash
npm install
npm run generate:data
npm run dev
```

## Build

```bash
npm run test
npm run build
npm run preview
```

`npm run build` runs `npm run generate:data` first, then checks TypeScript and builds `dist`.

## Data Update

1. Export CSV from Airtable with the current schema.
2. Replace `data/drinkups-base.csv`.
3. Run `npm run generate:data`.
4. Check `docs/data-report.md`.
5. Run `npm run test`.
6. Run `npm run build`.

The generated files live in `src/generated/`:

- `drinkups.json` for the list and filters.
- `venues.json` for the Leaflet map.
- `data-report.json` for summary metadata.

Records without coordinates stay visible in the drinkup list, but are excluded from the map.
Missing coordinates and empty addresses are reported in `docs/data-report.md`.

## Assets

- Main logo: `public/logo-beerjs-moscow.png`.
- Favicon: `public/favicon.svg`.
- Reference design: `docs/reference/beerjs_moscow_website_design.jpg`.
- CSV source: `data/drinkups-base.csv`.

## Deploy

The site is published from the contents of `dist` to the `gh-pages` branch.

```bash
npm run build
npm run deploy:gh-pages
```

The deploy script creates a temporary detached worktree for `origin/gh-pages`, preserves the
existing `CNAME`, copies `dist`, shows the diff, and creates a commit. It does not push unless
explicitly requested:

```bash
npm run deploy:gh-pages -- --push
```

Do not force-push `gh-pages` and do not delete `CNAME`; it is required for `beerjs.moscow`.
