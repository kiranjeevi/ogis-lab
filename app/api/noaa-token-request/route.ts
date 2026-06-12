import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Proxies a token request to NOAA's CDO web token service. NOAA emails the
 * token to the supplied address rather than returning it directly, so this
 * just confirms the request was submitted.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://www.ncdc.noaa.gov/cdo-web/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
      },
      body: new URLSearchParams({ email }).toString(),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `NOAA token request failed (${res.status})` },
        { status: 502 }
      );
    }

    const text = await res.text();
    const alreadyRegistered = /already\s+(?:a\s+)?token/i.test(text);
    const sent = /e-?mail/i.test(text);

    if (!sent && !alreadyRegistered) {
      return NextResponse.json(
        {
          error:
            "NOAA did not confirm the request. Please use the official token request page.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: alreadyRegistered
        ? "This email already has a NOAA CDO token on file. Check your inbox (including past emails) for it."
        : "Request submitted. NOAA will email your CDO API token shortly.",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach NOAA's token service. Please try again later." },
      { status: 502 }
    );
  }
}
