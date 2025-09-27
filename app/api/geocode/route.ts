import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Use Nominatim API for geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      {
        headers: {
          "User-Agent": "CELESTIA App",
        },
      },
    )

    if (!response.ok) {
      throw new Error("Failed to geocode location")
    }

    const data = await response.json()

    // Transform the response to our format
    const locations = data.map((item: any) => ({
      name: item.display_name,
      lat: Number.parseFloat(item.lat),
      lng: Number.parseFloat(item.lon),
      country: item.address?.country || "",
      city: item.address?.city || item.address?.town || item.address?.village || "",
      type: item.type,
    }))

    return NextResponse.json({ locations })
  } catch (error) {
    console.error("Error geocoding:", error)
    return NextResponse.json({ error: "Failed to geocode location" }, { status: 500 })
  }
}
