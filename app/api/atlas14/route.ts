import { NextRequest, NextResponse } from "next/server";
import { fetchAtlas14_24hr2yr } from "@/lib/noaa";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json(
      { error: "lat and lon query parameters are required" },
      { status: 400 }
    );
  }

  try {
    const result = await fetchAtlas14_24hr2yr(lat, lon);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 }
    );
  }
}
