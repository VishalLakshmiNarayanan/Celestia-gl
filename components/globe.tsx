"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { Marker } from "@/lib/types"

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false })

interface GlobeComponentProps {
  markers: Marker[]
  onMarkerClick: (marker: Marker, position: { x: number; y: number }) => void
  selectedMarkerId?: string
}

export function GlobeComponent({ markers, onMarkerClick, selectedMarkerId }: GlobeComponentProps) {
  const globeRef = useRef<any>()
  const [globeReady, setGlobeReady] = useState(false)

  useEffect(() => {
    if (globeRef.current && globeReady) {
      // Set initial camera position
      globeRef.current.pointOfView({ altitude: 2.5 })

      // Enable auto-rotation
      globeRef.current.controls().autoRotate = true
      globeRef.current.controls().autoRotateSpeed = 0.5
    }
  }, [globeReady])

  useEffect(() => {
    if (globeRef.current && globeReady && markers.length > 0) {
      // Get the most recent marker (last in array)
      const latestMarker = markers[markers.length - 1]

      // Animate to the new marker location
      globeRef.current.pointOfView(
        {
          lat: latestMarker.lat,
          lng: latestMarker.lng,
          altitude: 1.5, // Zoom in closer
        },
        2000, // Animation duration in ms
      )

      // After zooming, zoom back out slightly for better view
      setTimeout(() => {
        if (globeRef.current) {
          globeRef.current.pointOfView(
            {
              lat: latestMarker.lat,
              lng: latestMarker.lng,
              altitude: 2.0, // Slightly zoomed out
            },
            1000,
          )
        }
      }, 2500)
    }
  }, [markers, globeReady]) // Updated dependency to include markers

  const handleMarkerClick = (marker: any, event: any) => {
    const canvas = event.target
    const rect = canvas.getBoundingClientRect()
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }

    // Also zoom to clicked marker
    if (globeRef.current) {
      globeRef.current.pointOfView(
        {
          lat: marker.lat,
          lng: marker.lng,
          altitude: 1.8,
        },
        1500,
      )
    }

    onMarkerClick(marker, position)
  }

  return (
    <div className="relative w-full h-full">
      <Globe
        ref={globeRef}
         globeImageUrl="/textures/earth-night.jpg"
        bumpImageUrl="/textures/earth-topology.png"
        backgroundImageUrl="/textures/night-sky.png"
        // Markers configuration
        pointsData={markers}
        pointAltitude={0.02}
        pointRadius={0.8}
        pointColor={(marker: any) => (selectedMarkerId === marker.id ? "#00ffff" : "#ff6b6b")}
        pointLabel={(marker: any) => `
          <div class="bg-black/80 text-cyan-400 px-2 py-1 rounded text-sm border border-cyan-400/30">
            ${marker.name}
          </div>
        `}
        onPointClick={handleMarkerClick}
        // Globe styling
        atmosphereColor="#00ffff"
        atmosphereAltitude={0.15}
        // Animation settings
        animateIn={true}
        waitForGlobeReady={true}
        onGlobeReady={() => setGlobeReady(true)}
        // Controls
        enablePointerInteraction={true}
      />

      {/* Holographic overlay effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanlines effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent animate-pulse" />

        {/* Corner brackets */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400/60" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400/60" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400/60" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400/60" />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent"
            style={{
              backgroundImage: `
                   linear-gradient(90deg, transparent 49%, rgba(0,255,255,0.1) 50%, transparent 51%),
                   linear-gradient(0deg, transparent 49%, rgba(0,255,255,0.1) 50%, transparent 51%)
                 `,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
      </div>
    </div>
  )
}
