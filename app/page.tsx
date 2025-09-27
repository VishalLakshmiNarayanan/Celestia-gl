// app/page.tsx
"use client"

import { useEffect, useState } from "react"
import { GlobeComponent } from "@/components/globe"
import { SearchBar } from "@/components/search-bar"
import { HologramCard } from "@/components/hologram-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Trash2, Info } from "lucide-react"
import { useMarkers } from "@/hooks/use-markers"
import type { Marker, Location, HologramCardData } from "@/lib/types"

// Trip hop logic + UI
import { useTripSelection } from "@/hooks/use-trip"
import TripCard from "@/components/trip-card"

// include flightsUrl from API
type TripResp = { itinerary: any; flights: any[]; flightsUrl?: string }

export default function CelestiaPage() {
  const { markers, addMarker, clearMarkers, isLoading } = useMarkers()

  const [selectedCard, setSelectedCard] = useState<HologramCardData | null>(null)
  const [isAddingMarker, setIsAddingMarker] = useState(false)

  const [totalKm, setTotalKm] = useState(0)
  const [clearSignal, setClearSignal] = useState(0)

  // Trip selection + state
  const { previous, current, select, hasHop } = useTripSelection()
  const [tripLoading, setTripLoading] = useState(false)
  const [tripData, setTripData] = useState<TripResp | null>(null)
  const [showTrip, setShowTrip] = useState(true) // allow closing the Trip card

  const handleLocationSelect = async (location: Location) => {
    setIsAddingMarker(true)
    try {
      const newMarker = await addMarker(location)
      console.log("[v0] Successfully added marker:", newMarker?.name)
    } catch (error) {
      console.error("Failed to add marker:", error)
    } finally {
      setIsAddingMarker(false)
    }
  }

  const handleMarkerClick = (marker: Marker, position: { x: number; y: number }) => {
    console.log("[v0] Marker clicked:", marker.name, "Facts:", marker.facts.length, "Videos:", marker.videos.length)

    // remember hop endpoints
    select({
      id: marker.id,
      name: marker.name,
      lat: marker.lat,
      lng: marker.lng,
      // @ts-expect-error optional in your types
      iata: (marker as any).iata,
    })

    setSelectedCard({ marker, isVisible: true, position })
  }

  const handleCloseCard = () => setSelectedCard(null)

  const handleClearAll = () => {
    clearMarkers()
    setClearSignal((s) => s + 1)
    setTotalKm(0)
    setSelectedCard(null)
    setTripData(null)
    setShowTrip(false)
  }

  // Reopen Trip card when a new valid hop appears
  useEffect(() => {
    if (hasHop) setShowTrip(true)
  }, [hasHop])

  // Fetch trip once we have previous → current
  useEffect(() => {
    const run = async () => {
      if (!hasHop || !previous || !current) {
        setTripData(null)
        return
      }
      setTripLoading(true)
      try {
        const r = await fetch("/api/trip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: { name: previous.name, lat: previous.lat, lng: previous.lng, iata: (previous as any).iata },
            to:   { name: current.name,  lat: current.lat,  lng: current.lng,  iata: (current as any).iata },
          }),
        })
        const data = await r.json()
        setTripData(data)
      } catch (e) {
        console.error("Trip fetch failed:", e)
        setTripData(null)
      } finally {
        setTripLoading(false)
      }
    }
    run()
  }, [hasHop, previous, current])

  const refreshTrip = async () => {
    if (!previous || !current) return
    setTripLoading(true)
    setTripData(null)
    try {
      const r = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { name: previous.name, lat: previous.lat, lng: previous.lng, iata: (previous as any).iata },
          to:   { name: current.name,  lat: current.lat,  lng: current.lng,  iata: (current as any).iata },
        }),
      })
      const data = await r.json()
      setTripData(data)
    } finally {
      setTripLoading(false)
    }
  }

  const tripVisible = hasHop && previous && current && showTrip

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 p-6 border-b border-cyan-400/20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cyan-100">CELESTIA</h1>
              <p className="text-cyan-400/70 text-sm">Interactive 3D World Explorer</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <SearchBar onLocationSelect={handleLocationSelect} />
            {markers.length > 0 && (
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="border-red-400/30 text-red-400 hover:bg-red-400/10 hover:border-red-400 bg-transparent"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 h-[calc(100vh-120px)]">
        {/* Globe Container */}
        <div className="absolute inset-0">
          <GlobeComponent
            markers={markers}
            onMarkerClick={handleMarkerClick}
            selectedMarkerId={selectedCard?.marker.id}
            onTotalDistance={setTotalKm}
            clearSignal={clearSignal}
          />
        </div>

        {/* Loading Overlay */}
        {(isLoading || isAddingMarker) && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4 flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="text-cyan-100 text-sm">{isAddingMarker ? "Adding marker..." : "Loading..."}</span>
          </div>
        )}

        {/* Stats Panel (auto-relocate if Trip card is visible to avoid overlap) */}
        {markers.length > 0 &&
          (() => {
            const uniquePlaces = new Set(markers.map((m) => m.name)).size
            const uniqueCountries = new Set(
              markers.map((m) => {
                const parts = m.name.split(",").map((p) => p.trim())
                return parts[parts.length - 1]
              }),
            ).size

            return (
              <div
                className={
                  tripVisible
                    ? "absolute top-4 left-4 bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4"
                    : "absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4"
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300 font-medium text-sm">Explorer Stats</span>
                </div>
                <div className="space-y-1 text-xs text-cyan-100/80">
                  <div>Places Viewed: {uniquePlaces}</div>
                  <div>Countries Viewed: {uniqueCountries}</div>
                  <div>Total Distance: {totalKm.toLocaleString()} km</div>
                </div>
              </div>
            )
          })()}
      </main>

      {/* Discovery/Hologram Card */}
      {selectedCard && (
        <HologramCard
          marker={selectedCard.marker}
          position={selectedCard.position}
          onClose={handleCloseCard}
          isVisible={selectedCard.isVisible}
        />
      )}

      {/* Trip Card — bottom-left; same animate-in utilities; closeable */}
      {tripVisible && (
        <div className="fixed bottom-6 left-6 z-20 pointer-events-auto">
          <div className="w-[420px] animate-in fade-in-0 zoom-in-95 duration-300">
            <TripCard
              fromName={previous!.name}
              toName={current!.name}
              isLoading={tripLoading}
              itinerary={tripData?.itinerary}
              flights={tripData?.flights}
              flightsUrl={tripData?.flightsUrl}
              onRefresh={refreshTrip}
              onClose={() => setShowTrip(false)}
            />
          </div>
        </div>
      )}

      {/* Holographic scanline effect */}
      <div className="absolute inset-0 pointer-events-none scanline-effect" />
    </div>
  )
}
