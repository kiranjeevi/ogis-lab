"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  LatLng,
  Station,
  DailyPrecip,
  RainfallSummary,
  Atlas14Result,
} from "@/lib/types";
import { buildRainfallCsv } from "@/lib/csv";

const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      Loading map...
    </div>
  ),
});

const TOKEN_STORAGE_KEY = "noaa_cdo_token";
const DEFAULT_POSITION: LatLng = { lat: 38.8951, lon: -77.0364 }; // Washington, DC

const currentYear = new Date().getFullYear();
const DEFAULT_END_YEAR = currentYear - 1;
const DEFAULT_START_YEAR = DEFAULT_END_YEAR - 29;

export default function Home() {
  const [position, setPositionState] = useState<LatLng>(DEFAULT_POSITION);
  const [latInput, setLatInput] = useState(String(DEFAULT_POSITION.lat));
  const [lonInput, setLonInput] = useState(String(DEFAULT_POSITION.lon));
  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? ""
  );
  const [startYear, setStartYear] = useState(DEFAULT_START_YEAR);
  const [endYear, setEndYear] = useState(DEFAULT_END_YEAR);

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);

  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<
    { label: string; lat: number; lon: number }[]
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyPrecip[] | null>(null);
  const [summary, setSummary] = useState<RainfallSummary | null>(null);
  const [atlas14, setAtlas14] = useState<Atlas14Result | null>(null);
  const [atlas14Error, setAtlas14Error] = useState<string | null>(null);

  function setPosition(next: LatLng) {
    setPositionState(next);
    setLatInput(next.lat.toFixed(5));
    setLonInput(next.lon.toFixed(5));
  }

  function handleTokenChange(value: string) {
    setToken(value);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
  }

  function applyManualCoordinates() {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    setPosition({ lat, lon });
  }

  async function searchAddress() {
    const query = addressQuery.trim();
    if (!query) return;
    setAddressError(null);
    setAddressResults([]);
    setAddressLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/geocode?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to search address");
      setAddressResults(data.results);
      if (data.results.length === 0) {
        setAddressError("No matches found.");
      }
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAddressLoading(false);
    }
  }

  function selectAddressResult(result: { label: string; lat: number; lon: number }) {
    setPosition({ lat: result.lat, lon: result.lon });
    setAddressQuery(result.label);
    setAddressResults([]);
  }

  async function findStations() {
    setStationsError(null);
    setStations([]);
    setSelectedStationId("");
    setStationsLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(position.lat),
        lon: String(position.lon),
        token,
      });
      const res = await fetch(`/api/stations?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch stations");
      const result: Station[] = data.stations;
      setStations(result);
      if (result.length > 0) setSelectedStationId(result[0].id);
    } catch (err) {
      setStationsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setStationsLoading(false);
    }
  }

  async function runAnalysis() {
    if (!selectedStationId) return;
    const station = stations.find((s) => s.id === selectedStationId);
    if (!station) return;

    setAnalysisError(null);
    setAtlas14Error(null);
    setDaily(null);
    setSummary(null);
    setAtlas14(null);
    setAnalysisLoading(true);

    try {
      const params = new URLSearchParams({
        stationId: station.id,
        stationName: station.name,
        token,
        startYear: String(startYear),
        endYear: String(endYear),
      });
      const res = await fetch(`/api/precipitation?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch precipitation data");
      setDaily(data.daily);
      setSummary(data.summary);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAnalysisLoading(false);
    }

    try {
      const params = new URLSearchParams({
        lat: String(position.lat),
        lon: String(position.lon),
      });
      const res = await fetch(`/api/atlas14?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch Atlas 14 data");
      setAtlas14(data.result);
    } catch (err) {
      setAtlas14Error(err instanceof Error ? err.message : "Unknown error");
    }
  }

  function downloadCsv() {
    if (!daily || !summary) return;
    const station = stations.find((s) => s.id === selectedStationId);
    if (!station) return;

    const csv = buildRainfallCsv(station, daily, summary, atlas14);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rainfall-events_${station.id}_${summary.startDate}_${summary.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Rainfall Events Toolkit (RET)
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a project location, pull historical NOAA daily rainfall and
          NOAA Atlas 14 design storm data, and export a CSV for the LEED
          Rainfall Events Calculator (SS Credit: Rainwater Management).
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="h-[400px] w-full overflow-hidden rounded-lg border border-zinc-200 lg:h-auto lg:flex-1 dark:border-zinc-800">
          <MapPicker position={position} onChange={setPosition} />
        </section>

        <section className="flex w-full flex-col gap-4 lg:w-[420px]">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Project Location
            </h2>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Search for an address, click the map, or enter coordinates
              directly.
            </p>

            <label className="flex flex-col text-xs text-zinc-600 dark:text-zinc-400">
              Address or place
              <div className="mt-1 flex gap-2">
                <input
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchAddress();
                    }
                  }}
                  placeholder="e.g. 1600 Pennsylvania Ave, Washington, DC"
                />
                <button
                  onClick={searchAddress}
                  disabled={addressLoading || !addressQuery.trim()}
                  className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {addressLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </label>
            {addressError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addressError}</p>
            )}
            {addressResults.length > 0 && (
              <ul className="mt-2 divide-y divide-zinc-200 rounded border border-zinc-300 text-xs dark:divide-zinc-700 dark:border-zinc-700">
                {addressResults.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => selectAddressResult(r)}
                      className="block w-full px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex gap-2">
              <label className="flex flex-1 flex-col text-xs text-zinc-600 dark:text-zinc-400">
                Latitude
                <input
                  className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  onBlur={applyManualCoordinates}
                />
              </label>
              <label className="flex flex-1 flex-col text-xs text-zinc-600 dark:text-zinc-400">
                Longitude
                <input
                  className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  onBlur={applyManualCoordinates}
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              NOAA Settings
            </h2>
            <label className="flex flex-col text-xs text-zinc-600 dark:text-zinc-400">
              NOAA CDO API Token (optional)
              <input
                className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={token}
                onChange={(e) => handleTokenChange(e.target.value)}
                placeholder="Uses a shared server token if left blank"
              />
            </label>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              This tool ships with a server-side NOAA token, so most users can
              leave this blank. If you hit rate limits, enter your own free
              token for dedicated quota.
            </p>
            <a
              href="https://www.ncdc.noaa.gov/cdo-web/token"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Request a free NOAA CDO API token
            </a>

            <div className="mt-3 flex gap-2">
              <label className="flex flex-1 flex-col text-xs text-zinc-600 dark:text-zinc-400">
                Start Year
                <input
                  type="number"
                  className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={startYear}
                  onChange={(e) => setStartYear(parseInt(e.target.value, 10))}
                />
              </label>
              <label className="flex flex-1 flex-col text-xs text-zinc-600 dark:text-zinc-400">
                End Year
                <input
                  type="number"
                  className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={endYear}
                  onChange={(e) => setEndYear(parseInt(e.target.value, 10))}
                />
              </label>
            </div>

            <button
              onClick={findStations}
              disabled={!token || stationsLoading}
              className="mt-3 w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {stationsLoading ? "Searching..." : "Find Nearby Stations"}
            </button>
            {stationsError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{stationsError}</p>
            )}
          </div>

          {stations.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Select Station
              </h2>
              <select
                className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.distanceMiles.toFixed(1)} mi, coverage{" "}
                    {(s.datacoverage * 100).toFixed(0)}%, {s.mindate} to {s.maxdate})
                  </option>
                ))}
              </select>

              <button
                onClick={runAnalysis}
                disabled={analysisLoading}
                className="mt-3 w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {analysisLoading ? "Fetching data..." : "Run Rainfall Analysis"}
              </button>
              {analysisError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{analysisError}</p>
              )}
            </div>
          )}

          {summary && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Results
              </h2>
              <dl className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between">
                  <dt>Period of record</dt>
                  <dd>
                    {summary.startDate} to {summary.endDate}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Days with measurable precip</dt>
                  <dd>{summary.rainyDays}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>95th percentile rainfall depth</dt>
                  <dd>{summary.percentile95In.toFixed(2)} in</dd>
                </div>
                {atlas14 && (
                  <div className="flex justify-between">
                    <dt>Atlas 14 24-hr / 2-yr storm</dt>
                    <dd>{atlas14.depthIn.toFixed(2)} in</dd>
                  </div>
                )}
              </dl>
              {atlas14Error && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Atlas 14 lookup unavailable: {atlas14Error}. The 95th
                  percentile result above can still be used.
                </p>
              )}

              <button
                onClick={downloadCsv}
                className="mt-3 w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
              >
                Download CSV
              </button>

              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                The 95th percentile depth is calculated from all days with
                measurable precipitation over the selected period of record,
                consistent with EPA/LEED guidance for SS Credit: Rainwater
                Management. Confirm methodology and values with your LEED
                reviewer before submission.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
