// app/page.tsx
"use client"

import { useState } from "react"
import { GlobeComponent } from "@/components/globe"
import { SearchBar } from "@/components/search-bar"
import { HologramCard } from "@/components/hologram-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Trash2, Info } from "lucide-react"
import { useMarkers } from "@/hooks/use-markers"
import type { Marker, Location, HologramCardData } from "@/lib/types"

export default function CelestiaPage() {
  const { markers, addMarker, clearMarkers, isLoading } = useMarkers()

  const [selectedCard, setSelectedCard] = useState<HologramCardData | null>(null)
  const [isAddingMarker, setIsAddingMarker] = useState(false)

  // distance + clear signal for globe trails
  const [totalKm, setTotalKm] = useState(0)
  const [clearSignal, setClearSignal] = useState(0)

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
    setSelectedCard({ marker, isVisible: true, position })
  }

  const handleCloseCard = () => setSelectedCard(null)

  const handleClearAll = () => {
    clearMarkers()
    setClearSignal((s) => s + 1) // tells Globe to wipe arcs/plane immediately
    setTotalKm(0)
    setSelectedCard(null)
  }

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

        {/* Stats Panel */}
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
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4">
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

      {/* Holographic scanline effect */}
      <div className="absolute inset-0 pointer-events-none scanline-effect" />
    </div>
  )
}
