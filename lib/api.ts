import type { Location, Video } from "./types"

export async function geocodeLocation(query: string): Promise<Location[]> {
  const response = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new Error("Failed to geocode location")
  }

  const data = await response.json()
  return data.locations
}

export async function generateFacts(location: string): Promise<string[]> {
  const response = await fetch("/api/facts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location }),
  })

  if (!response.ok) {
    throw new Error("Failed to generate facts")
  }

  const data = await response.json()
  return data.facts
}

export async function fetchVideos(location: string): Promise<Video[]> {
  const response = await fetch("/api/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location }),
  })

  if (!response.ok) {
    throw new Error("Failed to fetch videos")
  }

  const data = await response.json()
  return data.videos
}
