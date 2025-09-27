"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import dynamic from "next/dynamic"
import * as THREE from "three"
import { geoInterpolate } from "d3-geo"              // npm i d3-geo
import type { Marker } from "@/lib/types"

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false })

interface GlobeComponentProps {
  markers: Marker[]
  onMarkerClick: (marker: Marker, position: { x: number; y: number }) => void
  selectedMarkerId?: string
}

type Arc = { startLat: number; startLng: number; endLat: number; endLng: number; color?: string }

export function GlobeComponent({
  markers,
  onMarkerClick,
  selectedMarkerId,
}: GlobeComponentProps) {
  const globeRef = useRef<any>(null)

  // Mount + ready guards
  const isMounted = useRef(false)
  const readySignal = useRef(false)
  const [globeReady, setGlobeReady] = useState(false)

  // Flight state
  const [arcs, setArcs] = useState<Arc[]>([])
  const [plane, setPlane] = useState<{ lat: number; lng: number; alt: number } | null>(null)
  const flightRaf = useRef<number | null>(null)

  // --- lifecycle guards
  useEffect(() => {
    isMounted.current = true
    if (readySignal.current && !globeReady) setGlobeReady(true)
    return () => {
      isMounted.current = false
      if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    }
  }, [globeReady])

  // --- camera + autorotate once ready
  useEffect(() => {
    if (!globeRef.current || !globeReady) return
    const controls = globeRef.current?.controls?.()
    globeRef.current?.pointOfView?.({ altitude: 2.5 }, 800)
    if (controls) {
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.45
      const handleEnd = () => { controls.autoRotate = true }
      controls.addEventListener?.("end", handleEnd)
      return () => controls.removeEventListener?.("end", handleEnd)
    }
  }, [globeReady])

  // --- zoom to latest marker when data changes
  useEffect(() => {
    if (!globeRef.current || !globeReady || markers.length === 0) return
    const m = markers[markers.length - 1]
    globeRef.current.pointOfView({ lat: m.lat, lng: m.lng, altitude: 1.6 }, 1400)
  }, [markers.length, globeReady])

  // --- click handler (unchanged)
  const handleMarkerClick = (marker: Marker, event: any) => {
    const canvas = event?.target as HTMLElement | null
    const rect = canvas?.getBoundingClientRect?.()
    const position = rect
      ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
      : { x: 0, y: 0 }

    globeRef.current?.pointOfView?.({ lat: marker.lat, lng: marker.lng, altitude: 1.8 }, 1500)
    onMarkerClick(marker, position)
  }

  // ---------- ✈️ FLIGHT LOGIC ----------
  // Call this to start a flight: startFlight("idA","idB")
  const startFlight = (
    fromId: string,
    toId: string,
    opts: { durationMs?: number; altitude?: number; color?: string } = {}
  ) => {
    const duration = opts.durationMs ?? 3500
    const arcAlt = opts.altitude ?? 0.18       // how "high" the arc looks
    const arcColor = opts.color ?? "#00ffff"

    const from = markers.find(m => m.id === fromId)
    const to = markers.find(m => m.id === toId)
    if (!from || !to) return

    // 1) Show (or update) the dotted arc
    setArcs([{ startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng, color: arcColor }])

    // 2) Interpolator along great-circle
    const interp = geoInterpolate([from.lng, from.lat], [to.lng, to.lat])

    // 3) Animate the "plane" object along the path
    if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    const start = performance.now()

    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration)
      const [lng, lat] = interp(t)
      // altitude here is the camera-height (not arc height). Keep it low so it's visible "on" the globe
      setPlane({ lat, lng, alt: 0.02 })
      if (t < 1) {
        flightRaf.current = requestAnimationFrame(tick)
      } else {
        flightRaf.current = null
      }
    }
    tick()

    // 4) Optional: move the camera to follow (comment out if you don't want this)
    globeRef.current?.pointOfView?.({ lat: from.lat, lng: from.lng, altitude: 1.8 }, 600)
    setTimeout(() => {
      globeRef.current?.pointOfView?.({ lat: to.lat, lng: to.lng, altitude: 1.8 }, Math.max(900, duration - 600))
    }, 600)
  }

  // Expose the starter if you want to trigger from outside (optional)
  ;(globalThis as any).__startFlight = startFlight
  // Usage in console: __startFlight("markerIdA","markerIdB")

  // --- plane mesh (tiny cone). Swap for sprite/GLTF if you prefer.
  const planeObjectFactory = useMemo(() => {
    const geom = new THREE.ConeGeometry(0.04, 0.12, 12)  // radius, height, segments
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    return () => {
      const mesh = new THREE.Mesh(geom, mat)
      // Point forward-ish
      mesh.rotateX(Math.PI / 2)
      return mesh
    }
  }, [])

  return (
    <div className="relative w-full h-[min(75vh,720px)]">
      <Globe
        ref={globeRef}
        globeImageUrl="/textures/earth-night.jpg"
        bumpImageUrl="/textures/earth-topology.png"
        backgroundImageUrl="/textures/night-sky.png"

        // --- Points / markers
        pointsData={markers}
        pointAltitude={0.02}
        pointRadius={0.8}
        pointColor={(m: any) => (selectedMarkerId === m.id ? "#00ffff" : "#ff6b6b")}
        pointLabel={(m: any) => `
          <div class="bg-black/80 text-cyan-400 px-2 py-1 rounded text-sm border border-cyan-400/30">
            ${m.name}
          </div>
        `}
        onPointClick={handleMarkerClick}

        // --- ✨ Dotted arc trail
        arcsData={arcs}
        arcColor={(a: Arc) => a.color ?? "#00ffff"}
        arcAltitude={0.18}            // visual height of arc
        arcStroke={0.6}
        arcDashLength={0.08}          // short dash = dotted feel
        arcDashGap={0.02}
        arcDashInitialGap={1}         // start off-screen
        arcDashAnimateTime={1200}     // how fast the dashes move

        // --- ✈️ Plane object
        objectsData={plane ? [plane] : []}
        objectLat={(d: any) => d.lat}
        objectLng={(d: any) => d.lng}
        objectAltitude={(d: any) => d.alt}
        objectThreeObject={planeObjectFactory}

        // Atmosphere / look
        atmosphereColor="#00ffff"
        atmosphereAltitude={0.15}

        // Readiness
        animateIn={false}
        waitForGlobeReady
        onGlobeReady={() => {
          readySignal.current = true
          if (isMounted.current) setGlobeReady(true)
        }}
        enablePointerInteraction
      />

      {/* Holographic overlay ... (keep your existing overlays) */}
    </div>
  )
}
