"use client"

import { useState, useCallback } from "react"
import type { Marker, Location } from "@/lib/types"
import { generateFacts, fetchVideos } from "@/lib/api"

export function useMarkers() {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addMarker = useCallback(async (location: Location) => {
    setIsLoading(true)

    try {
      // Generate unique ID
      const id = `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      console.log("[v0] Creating marker for location:", location.name)

      // Fetch facts and videos in parallel
      const [facts, videos] = await Promise.all([
        generateFacts(location.name),
        fetchVideos(location.name), // Use full location name for better specificity
      ])

      console.log("[v0] Fetched videos for location:", location.name, "Count:", videos.length)

      const newMarker: Marker = {
        id,
        lat: location.lat,
        lng: location.lng,
        name: location.name,
        facts,
        videos,
        timestamp: Date.now(),
      }

      setMarkers((prev) => [...prev, newMarker])
      console.log("[v0] Successfully added marker:", location.name, "Facts:", facts.length, "Videos:", videos.length)
      return newMarker
    } catch (error) {
      console.error("Failed to create marker:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const removeMarker = useCallback((id: string) => {
    setMarkers((prev) => prev.filter((marker) => marker.id !== id))
  }, [])

  const clearMarkers = useCallback(() => {
    setMarkers([])
  }, [])

  return {
    markers,
    addMarker,
    removeMarker,
    clearMarkers,
    isLoading,
  }
}
