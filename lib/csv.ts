import { DailyPrecip, RainfallSummary, Atlas14Result, Station } from "./types";

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildRainfallCsv(
  station: Station,
  daily: DailyPrecip[],
  summary: RainfallSummary,
  atlas14: Atlas14Result | null
): string {
  const lines: string[] = [];

  lines.push("LEED Rainfall Events Calculator - Data Export");
  lines.push(`Station,${escapeCsv(`${station.name} (${station.id})`)}`);
  lines.push(`Station Latitude,${station.latitude}`);
  lines.push(`Station Longitude,${station.longitude}`);
  lines.push(`Period of Record,${summary.startDate} to ${summary.endDate}`);
  lines.push(`Total Days,${summary.totalDays}`);
  lines.push(`Days With Measurable Precipitation,${summary.rainyDays}`);
  lines.push(
    `95th Percentile Daily Rainfall Depth (in),${summary.percentile95In.toFixed(2)}`
  );
  if (atlas14) {
    lines.push(
      `NOAA Atlas 14 ${atlas14.durationLabel} / ${atlas14.returnPeriodLabel} Design Storm (in),${atlas14.depthIn.toFixed(2)}`
    );
    lines.push(`Atlas 14 Source,${escapeCsv(atlas14.source)}`);
  }
  lines.push("");
  lines.push("Date,Daily Precipitation (in)");

  for (const d of daily) {
    if (d.precipIn > 0) {
      lines.push(`${d.date},${d.precipIn.toFixed(2)}`);
    }
  }

  return lines.join("\n");
}
