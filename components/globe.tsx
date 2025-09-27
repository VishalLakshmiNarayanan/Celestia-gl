"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { Marker } from "@/lib/types"

// Avoid SSR for three/Globe
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false })

interface GlobeComponentProps {
  markers: Marker[]
  onMarkerClick: (marker: Marker, position: { x: number; y: number }) => void
  selectedMarkerId?: string
}

export function GlobeComponent({
  markers,
  onMarkerClick,
  selectedMarkerId,
}: GlobeComponentProps) {
  const globeRef = useRef<any>(null)

  // Mount + ready guards
  const isMounted = useRef(false)
  const globeReadySignal = useRef(false) // set by onGlobeReady, committed in effect
  const [globeReady, setGlobeReady] = useState(false)

  // Track mount/unmount and safely commit ready signal
  useEffect(() => {
    isMounted.current = true
    if (globeReadySignal.current && !globeReady) {
      // commit any early "ready" signal after mount
      setGlobeReady(true)
    }
    return () => {
      isMounted.current = false
    }
  }, [globeReady])

  // Initialize camera + autorotate once ready (prod-safe)
  useEffect(() => {
    if (!globeRef.current || !globeReady) return

    const raf = requestAnimationFrame(() => {
      const controls = globeRef.current?.controls?.()
      globeRef.current?.pointOfView?.({ altitude: 2.5 }, 800)

      if (controls) {
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.45

        // keep spinning after user drag
        const handleEnd = () => {
          controls.autoRotate = true
        }
        controls.addEventListener?.("end", handleEnd)
        // cleanup listener on unmount
        return () => controls.removeEventListener?.("end", handleEnd)
      }
    })

    return () => cancelAnimationFrame(raf)
  }, [globeReady])

  // Fly to the newest marker when data length changes
  useEffect(() => {
    if (!globeRef.current || !globeReady || markers.length === 0) return
    const m = markers[markers.length - 1]
    globeRef.current.pointOfView(
      { lat: m.lat, lng: m.lng, altitude: 1.6 },
      1400
    )
  }, [markers.length, globeReady])

  const handleMarkerClick = (marker: Marker, event: any) => {
    const canvas = event?.target as HTMLElement | null
    const rect = canvas?.getBoundingClientRect?.()
    const position = rect
      ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
      : { x: 0, y: 0 }

    globeRef.current?.pointOfView?.(
      { lat: marker.lat, lng: marker.lng, altitude: 1.8 },
      1500
    )

    onMarkerClick(marker, position)
  }

  return (
    <div className="relative w-full h-full">
      <Globe
        ref={globeRef}
        // Local textures (from /public)
        globeImageUrl="/textures/earth-night.jpg"
        bumpImageUrl="/textures/earth-topology.png"
        backgroundImageUrl="/textures/night-sky.png"

        // Points
        pointsData={markers}
        pointAltitude={0.02}
        pointRadius={0.8}
        pointColor={(m: any) =>
          selectedMarkerId === m.id ? "#00ffff" : "#ff6b6b"
        }
        pointLabel={(m: any) => `
          <div class="bg-black/80 text-cyan-400 px-2 py-1 rounded text-sm border border-cyan-400/30">
            ${m.name}
          </div>
        `}
        onPointClick={handleMarkerClick}

        // Look
        atmosphereColor="#00ffff"
        atmosphereAltitude={0.15}

        // Animation/readiness
        animateIn={false}
        waitForGlobeReady={true}
        onGlobeReady={() => {
          // This can fire before our component mounts in prod.
          globeReadySignal.current = true
          if (isMounted.current) setGlobeReady(true)
        }}

        // Interaction
        enablePointerInteraction={true}
      />

      {/* Holographic overlay effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent animate-pulse" />
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400/60" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400/60" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400/60" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400/60" />
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
