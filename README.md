# ogis-lab — Rainfall Events Toolkit (RET)

A web portal for preparing the **LEED Rainfall Events Calculator** inputs for
**SS Credit: Rainwater Management**. Pick a project location on a web map,
pull historical rainfall data from NOAA, run the percentile/storm-event
analysis, and download everything as a CSV.

## Features

- **Web map location picker** — Leaflet + OpenStreetMap; click the map or
  search to set the project location.
- **NOAA station lookup** — finds nearby NCEI GHCN-Daily weather stations
  with long precipitation records.
- **Historical rainfall analysis** — fetches daily precipitation for the
  selected station and computes the LEED metrics (95th/98th percentile
  rainfall depth, number of qualifying storm events).
- **NOAA Atlas 14** — retrieves design-storm depths (e.g., 2-yr/24-hr) from
  the Precipitation Frequency Data Server for the project coordinates.
- **CSV export** — downloads the daily record plus the analysis summary,
  ready to support the LEED Rainfall Events Calculator.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) — frontend + API
  routes that proxy NOAA services (avoids CORS issues)
- [React Leaflet](https://react-leaflet.js.org) + OpenStreetMap tiles
- Tailwind CSS

## Project structure

```
app/page.tsx                   Main UI (map, station list, analysis, CSV download)
app/api/stations/route.ts      Nearby GHCN-Daily stations for a lat/lon
app/api/precipitation/route.ts Daily precipitation + LEED summary for a station
app/api/atlas14/route.ts       NOAA Atlas 14 design-storm depths for a lat/lon
components/MapPicker.tsx       Leaflet map component
lib/noaa.ts                    NOAA NCEI / Atlas 14 client code
lib/stats.ts                   Percentile & storm-event calculations
lib/csv.ts                     CSV builder
```

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, click your project location on the map, pick a
station, run the analysis, and download the CSV. No API keys or environment
variables are required — the NOAA endpoints are public.

## Deploy (Firebase App Hosting)

The app uses server-side API routes, so it runs on **Firebase App Hosting**
(not classic static Hosting):

1. In the [Firebase console](https://console.firebase.google.com), open your
   project (Blaze plan required) → **Build → App Hosting → Get started**.
2. Connect GitHub and select this repository.
3. Set the live branch to `master`, root directory `/`, and enable automatic
   rollouts.

Firebase detects Next.js automatically; every push to `master` redeploys.
