import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    limit: "5",
    addressdetails: "0",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": "rainfall-events-toolkit (LEED rainfall data tool)",
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding lookup failed" }, { status: 502 });
  }

  const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
  const results = data.map((item) => ({
    label: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }));

  return NextResponse.json({ results });
}
