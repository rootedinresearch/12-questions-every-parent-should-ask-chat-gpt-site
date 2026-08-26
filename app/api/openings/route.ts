import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsJson?orgid=553758");
    if (!response.ok) {
      return NextResponse.json({ success: false, error: "Failed to fetch from Jackrabbit" }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
