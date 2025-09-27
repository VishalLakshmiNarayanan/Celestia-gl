"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import * as THREE from "three"
import { geoInterpolate } from "d3-geo"           // npm i d3-geo
import type { Marker } from "@/lib/types"

// Avoid SSR for three/Globe
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false })

interface GlobeComponentProps {
  markers: Marker[]
  onMarkerClick: (marker: Marker, position: { x: number; y: number }) => void
  selectedMarkerId?: string
}

type Arc = { startLat: number; startLng: number; endLat: number; endLng: number; color?: string }
type Plane = { lat: number; lng: number; alt: number }

export function GlobeComponent({
  markers,
  onMarkerClick,
  selectedMarkerId,
}: GlobeComponentProps) {
  const globeRef = useRef<any>(null)

  // Mount + ready guards (prevents state update before mount in prod)
  const isMounted = useRef(false)
  const readySignal = useRef(false)
  const [globeReady, setGlobeReady] = useState(false)

  // Flight state
  const [arcs, setArcs] = useState<Arc[]>([])
  const [plane, setPlane] = useState<Plane | null>(null)
  const flightRaf = useRef<number | null>(null)

  // ----- lifecycle guards
  useEffect(() => {
    isMounted.current = true
    if (readySignal.current && !globeReady) setGlobeReady(true)
    return () => {
      isMounted.current = false
      if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    }
  }, [globeReady])

  // ----- camera + autorotate once ready
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

  // ----- UX: fly camera to latest marker
  useEffect(() => {
    if (!globeRef.current || !globeReady || markers.length === 0) return
    const m = markers[markers.length - 1]
    globeRef.current.pointOfView({ lat: m.lat, lng: m.lng, altitude: 1.6 }, 1200)
  }, [markers.length, globeReady])

  // ----- FLIGHT LOGIC
  const startFlight = (
    from: Marker,
    to: Marker,
    opts: { durationMs?: number; color?: string; arcAltitude?: number } = {}
  ) => {
    const duration = opts.durationMs ?? 3600
    const color = opts.color ?? "#00ffff"
    const arcAltitude = opts.arcAltitude ?? 0.28 // high enough to clear horizon

    // 1) show dotted arc
    setArcs([{ startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng, color }])

    // 2) animate plane along great-circle
    if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    const interp = geoInterpolate([from.lng, from.lat], [to.lng, to.lat])
    const t0 = performance.now()

    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / duration)
      const [lng, lat] = interp(t)

      // altitude hump so plane never hugs/clips the surface
      const base = 0.04          // near ends
      const peak = Math.min(arcAltitude, 0.32) // match/under arc height
      const alt = base + Math.sin(Math.PI * t) * (peak - base)

      setPlane({ lat, lng, alt })
      if (t < 1) {
        flightRaf.current = requestAnimationFrame(tick)
      } else {
        flightRaf.current = null
        // optional: clear after arrival
        // setArcs([]); setPlane(null)
      }
    }
    tick()

    // 3) optional camera follow
    globeRef.current?.pointOfView?.({ lat: from.lat, lng: from.lng, altitude: 1.8 }, 600)
    setTimeout(() => {
      globeRef.current?.pointOfView?.({ lat: to.lat, lng: to.lng, altitude: 1.8 }, Math.max(900, duration - 600))
    }, 600)
  }

  // Auto-start flight on “new marker added” (previous ➜ latest)
  useEffect(() => {
    if (!globeReady || markers.length < 2) return
    const from = markers[markers.length - 2]
    const to = markers[markers.length - 1]
    startFlight(from, to)
  }, [markers.length, globeReady])

  // Expose for quick console testing: __fly("idA","idB")
  ;(globalThis as any).__fly = (a: string, b: string) => {
    const from = markers.find(m => m.id === a)
    const to = markers.find(m => m.id === b)
    if (from && to) startFlight(from, to)
  }

  // Click handler (kept)
  const handleMarkerClick = (marker: Marker, event: any) => {
    const rect = (event?.target as HTMLElement)?.getBoundingClientRect?.()
    const position = rect
      ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
      : { x: 0, y: 0 }
    globeRef.current?.pointOfView?.({ lat: marker.lat, lng: marker.lng, altitude: 1.8 }, 1000)
    onMarkerClick(marker, position)
  }

  // Tiny cone as the plane (swap for sprite/GLTF if you like)
  const planeObjectFactory = useMemo(() => {
    const geom = new THREE.ConeGeometry(0.04, 0.12, 12)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    return () => {
      const mesh = new THREE.Mesh(geom, mat)
      mesh.rotateX(Math.PI / 2) // face forward
      return mesh
    }
  }, [])

  return (
    // Explicit height so canvas isn't 0px in prod
    <div className="relative w-full h-[min(75vh,720px)]">
      <Globe
        ref={globeRef}

        // Textures (from /public)
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

        // --- DOTTED TRAIL (raised + smooth so it never clips)
        arcsData={arcs}
        arcColor={(a: Arc) => a.color ?? "#00ffff"}
        arcStroke={0.9}
        arcAltitude={() => 0.28}         // high arc for clear visibility
        arcAltitudeAutoScale={false}      // keep constant height regardless of distance
        arcCurveResolution={128}          // smooth curve; no chord-through-sphere
        arcDashLength={0.08}
        arcDashGap={0.02}
        arcDashInitialGap={1}
        arcDashAnimateTime={1100}

        // --- PLANE OBJECT
        objectsData={plane ? [plane] : []}
        objectLat={(d: Plane) => d.lat}
        objectLng={(d: Plane) => d.lng}
        objectAltitude={(d: Plane) => d.alt}
        objectThreeObject={planeObjectFactory}

        // Look
        atmosphereColor="#00ffff"
        atmosphereAltitude={0.15}

        // Readiness (avoid built-in tween race)
        animateIn={false}
        waitForGlobeReady
        onGlobeReady={() => {
          readySignal.current = true
          if (isMounted.current) setGlobeReady(true)
        }}
        enablePointerInteraction
      />

      {/* Optional HUD overlays (yours) */}
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
