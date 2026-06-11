import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyStations } from "@/lib/noaa";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const token = searchParams.get("token") ?? "";

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json(
      { error: "lat and lon query parameters are required" },
      { status: 400 }
    );
  }
  if (!token) {
    return NextResponse.json(
      { error: "A NOAA CDO API token is required" },
      { status: 400 }
    );
  }

  try {
    const stations = await fetchNearbyStations(lat, lon, token);
    return NextResponse.json({ stations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
