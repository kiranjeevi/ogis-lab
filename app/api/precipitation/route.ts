import { NextRequest, NextResponse } from "next/server";
import { fetchDailyPrecip } from "@/lib/noaa";
import { percentile } from "@/lib/stats";
import { RainfallSummary } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId") ?? "";
  const stationName = searchParams.get("stationName") ?? stationId;
  const token = searchParams.get("token") ?? "";
  const startYear = parseInt(searchParams.get("startYear") ?? "", 10);
  const endYear = parseInt(searchParams.get("endYear") ?? "", 10);

  if (!stationId || !token) {
    return NextResponse.json(
      { error: "stationId and token query parameters are required" },
      { status: 400 }
    );
  }
  if (Number.isNaN(startYear) || Number.isNaN(endYear) || startYear > endYear) {
    return NextResponse.json(
      { error: "Valid startYear and endYear query parameters are required" },
      { status: 400 }
    );
  }
  if (endYear - startYear > 40) {
    return NextResponse.json(
      { error: "Date range is limited to 40 years" },
      { status: 400 }
    );
  }

  try {
    const daily = await fetchDailyPrecip(stationId, token, startYear, endYear);
    const rainyDepths = daily.filter((d) => d.precipIn > 0).map((d) => d.precipIn);

    const summary: RainfallSummary = {
      stationId,
      stationName,
      startDate: `${startYear}-01-01`,
      endDate: `${endYear}-12-31`,
      totalDays: daily.length,
      rainyDays: rainyDepths.length,
      totalPrecipIn: rainyDepths.reduce((a, b) => a + b, 0),
      percentile95In: percentile(rainyDepths, 95),
    };

    return NextResponse.json({ daily, summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
