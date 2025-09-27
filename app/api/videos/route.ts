import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { location } = await request.json()

    if (!location) {
      return NextResponse.json({ error: "Location is required" }, { status: 400 })
    }

    console.log("[v0] Fetching videos for location:", location)

    // Extract key location terms and add relevant keywords
    const locationTerms = location.split(",").map((term: string) => term.trim())
    const primaryLocation = locationTerms[0] // Main city/place name
    const region = locationTerms[1] || "" // State/region
    const country = locationTerms[locationTerms.length - 1] // Country name

    console.log("[v0] Parsed location - Primary:", primaryLocation, "Region:", region, "Country:", country)

    const searchQueries = [
      `${country} ${primaryLocation} landmarks`, // Country + location landmarks
      `${region} ${primaryLocation} culture`, // Region + location culture
      `${primaryLocation} ${country} tourism`, // Location + country tourism
      `${primaryLocation} aerial drone view`, // Aerial views of location
      `${country} traditional culture lifestyle`, // Country culture and vibes
      `${primaryLocation} street life local`, // Local street scenes and vibes
    ].filter((query) => query.trim().length > 5) // Remove empty queries

    console.log("[v0] Search queries:", searchQueries)

    // Try each search query until we get good results
    const allVideos: any[] = []

    for (const query of searchQueries) {
      if (allVideos.length >= 8) break // Get more videos to have better selection

      try {
        console.log("[v0] Searching videos with query:", query)
        const response = await fetch(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
          {
            headers: {
              Authorization: process.env.PEXELS_API_KEY || "",
            },
          },
        )

        if (response.ok) {
          const data = await response.json()
          if (data.videos?.length > 0) {
            console.log("[v0] Found", data.videos.length, "videos for query:", query)
            allVideos.push(...data.videos)
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch videos for query: ${query}`, error)
      }
    }

    // Remove duplicates and prioritize diverse content
    const uniqueVideos = allVideos
      .filter((video, index, self) => self.findIndex((v) => v.id === video.id) === index)
      .sort(() => Math.random() - 0.5) // Randomize to get different videos each time
      .slice(0, 5)

    console.log("[v0] Selected", uniqueVideos.length, "unique videos")

    // Extract video URLs from the response
    const videos = uniqueVideos.map((video: any) => ({
      id: video.id,
      url: video.video_files?.[0]?.link || "",
      thumbnail: video.image,
      duration: video.duration,
    }))

    console.log(
      "[v0] Returning videos:",
      videos.map((v) => ({ id: v.id, duration: v.duration })),
    )

    return NextResponse.json({ videos })
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}
