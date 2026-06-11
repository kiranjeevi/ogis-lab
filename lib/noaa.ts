import { haversineMiles } from "./geo";
import { Station, DailyPrecip, Atlas14Result } from "./types";

const CDO_BASE = "https://www.ncei.noaa.gov/cdo-web/api/v2";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CdoStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  mindate: string;
  maxdate: string;
  datacoverage: number;
}

export async function fetchNearbyStations(
  lat: number,
  lon: number,
  token: string,
  radiusDeg = 0.75,
  limit = 10
): Promise<Station[]> {
  const extent = `${lat - radiusDeg},${lon - radiusDeg},${lat + radiusDeg},${lon + radiusDeg}`;
  const url = `${CDO_BASE}/stations?datasetid=GHCND&extent=${extent}&limit=1000`;

  const res = await fetch(url, {
    headers: { token },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOAA stations request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { results?: CdoStation[] };
  const results = data.results ?? [];

  return results
    .map((s) => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      elevation: s.elevation,
      mindate: s.mindate,
      maxdate: s.maxdate,
      datacoverage: s.datacoverage,
      distanceMiles: haversineMiles(lat, lon, s.latitude, s.longitude),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
}

interface CdoDataPoint {
  date: string;
  datatype: string;
  station: string;
  value: number;
}

/**
 * Fetches daily PRCP totals for a station over [startYear, endYear] (inclusive).
 * The CDO API is queried one calendar year at a time to stay within its
 * per-request record limits, with a short delay between calls to respect
 * the published rate limit (5 requests/second, 10,000/day).
 */
export async function fetchDailyPrecip(
  stationId: string,
  token: string,
  startYear: number,
  endYear: number
): Promise<DailyPrecip[]> {
  const results: DailyPrecip[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    let offset = 1;

    while (true) {
      const url =
        `${CDO_BASE}/data?datasetid=GHCND&datatypeid=PRCP&units=metric` +
        `&stationid=${encodeURIComponent(stationId)}` +
        `&startdate=${startDate}&enddate=${endDate}` +
        `&limit=1000&offset=${offset}`;

      const res = await fetch(url, { headers: { token } });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `NOAA precipitation request failed (${res.status}): ${text}`
        );
      }

      const data = (await res.json()) as {
        results?: CdoDataPoint[];
        metadata?: { resultset?: { count: number; limit: number; offset: number } };
      };
      const points = data.results ?? [];

      for (const p of points) {
        // value is in tenths of millimeters; convert to inches
        results.push({
          date: p.date.slice(0, 10),
          precipIn: p.value / 254,
        });
      }

      const meta = data.metadata?.resultset;
      if (!meta || offset + points.length > meta.count || points.length === 0) {
        break;
      }
      offset += points.length;
      await sleep(220);
    }

    await sleep(220);
  }

  return results;
}

/**
 * Fetches the NOAA Atlas 14 precipitation frequency estimate for the
 * 24-hour, 2-year design storm at the given location, used as a
 * reference value alongside the 95th percentile rainfall depth.
 */
export async function fetchAtlas14_24hr2yr(
  lat: number,
  lon: number
): Promise<Atlas14Result> {
  const url = `https://hdsc.nws.noaa.gov/cgi-bin/hdsc/new/fe_text_mean.csv?lat=${lat}&lon=${lon}&data=depth&units=english&series=pds`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NOAA Atlas 14 request failed (${res.status})`);
  }
  const text = await res.text();

  const depthIn = parseAtlas14_24hr2yr(text);
  if (depthIn === null) {
    throw new Error("Could not parse NOAA Atlas 14 response");
  }

  return {
    depthIn,
    durationLabel: "24-hr",
    returnPeriodLabel: "2-yr",
    source: "NOAA Atlas 14 Point Precipitation Frequency Estimates (PDS)",
  };
}

/**
 * Parses the Atlas 14 PFDS "fe_text_mean.csv" table to extract the
 * 24-hour duration / 2-year return period depth. The table has a header
 * row of return periods (1, 2, 5, 10, 25, 50, 100, 200, 500, 1000-yr)
 * followed by rows for each duration, e.g. "24-hr:,1.23,1.45,...".
 */
export function parseAtlas14_24hr2yr(csvText: string): number | null {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim());

  let returnPeriodCols: number[] | null = null;

  for (const line of lines) {
    if (!returnPeriodCols) {
      const match = line.match(/^by duration for ARI \(years\):\s*(.+)$/i) ||
        line.match(/^ARI \(years\):\s*(.+)$/i);
      if (match) {
        returnPeriodCols = match[1]
          .split(",")
          .map((v) => parseFloat(v.trim()))
          .filter((v) => !Number.isNaN(v));
      }
      continue;
    }

    const rowMatch = line.match(/^24-hr:?,(.+)$/i) || line.match(/^24:00:?,(.+)$/i);
    if (rowMatch) {
      const values = rowMatch[1].split(",").map((v) => parseFloat(v.trim()));
      const twoYearIndex = returnPeriodCols.findIndex((p) => p === 2);
      if (twoYearIndex >= 0 && !Number.isNaN(values[twoYearIndex])) {
        return values[twoYearIndex];
      }
    }
  }

  return null;
}
