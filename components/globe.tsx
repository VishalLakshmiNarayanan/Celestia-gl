"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import * as THREE from "three"
import { geoInterpolate } from "d3-geo"
import type { Marker } from "@/lib/types"

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

  // mount/ready guards
  const isMounted = useRef(false)
  const readySignal = useRef(false)
  const [globeReady, setGlobeReady] = useState(false)

  // flight state
  const [arcs, setArcs] = useState<Arc[]>([])
  const [plane, setPlane] = useState<Plane | null>(null)
  const flightRaf = useRef<number | null>(null)

  // ---------- lifecycle ----------
  useEffect(() => {
    isMounted.current = true
    if (readySignal.current && !globeReady) setGlobeReady(true)
    return () => {
      isMounted.current = false
      if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    }
  }, [globeReady])

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

  // Fly camera to latest marker (nice UX)
  useEffect(() => {
    if (!globeRef.current || !globeReady || markers.length === 0) return
    const m = markers[markers.length - 1]
    globeRef.current.pointOfView({ lat: m.lat, lng: m.lng, altitude: 1.6 }, 1200)
  }, [markers.length, globeReady])

  // ---------- flight logic ----------
  const startFlight = (
    from: Marker,
    to: Marker,
    opts: { durationMs?: number; color?: string; arcAltitude?: number } = {}
  ) => {
    const duration = opts.durationMs ?? 3500
    const color = opts.color ?? "#00ffff"
    const arcAltitude = opts.arcAltitude ?? 0.18

    // show dotted arc
    setArcs([{ startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng, color }])

    // animate plane along great circle
    if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    const interp = geoInterpolate([from.lng, from.lat], [to.lng, to.lat])
    const t0 = performance.now()

    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / duration)
      const [lng, lat] = interp(t)
      setPlane({ lat, lng, alt: 0.02 }) // small altitude so it hugs the globe
      if (t < 1) {
        flightRaf.current = requestAnimationFrame(tick)
      } else {
        flightRaf.current = null
        // optional: clear trail/plane after arrival
        // setArcs([])
        // setPlane(null)
      }
    }
    tick()

    // optional camera move following the route
    globeRef.current?.pointOfView?.({ lat: from.lat, lng: from.lng, altitude: 1.8 }, 600)
    setTimeout(() => {
      globeRef.current?.pointOfView?.({ lat: to.lat, lng: to.lng, altitude: 1.8 }, Math.max(900, duration - 600))
    }, 600)
  }

  // Auto-start flight when a new marker is added (previous ➜ latest)
  useEffect(() => {
    if (!globeReady || markers.length < 2) return
    const from = markers[markers.length - 2]
    const to = markers[markers.length - 1]
    startFlight(from, to)
  }, [markers.length, globeReady]) // runs only when count increases

  // optional: expose for console testing: __fly("idA","idB")
  ;(globalThis as any).__fly = (a: string, b: string) => {
    const from = markers.find(m => m.id === a)
    const to = markers.find(m => m.id === b)
    if (from && to) startFlight(from, to)
  }

  // click handler (unchanged)
  const handleMarkerClick = (marker: Marker, event: any) => {
    const rect = (event?.target as HTMLElement)?.getBoundingClientRect?.()
    const position = rect
      ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
      : { x: 0, y: 0 }
    globeRef.current?.pointOfView?.({ lat: marker.lat, lng: marker.lng, altitude: 1.8 }, 1000)
    onMarkerClick(marker, position)
  }

  // tiny cone as the plane (swap with sprite/GLTF if you want)
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
    <div className="relative w-full h-[min(75vh,720px)]">
      <Globe
        ref={globeRef}
        globeImageUrl="/textures/earth-night.jpg"
        bumpImageUrl="/textures/earth-topology.png"
        backgroundImageUrl="/textures/night-sky.png"

        /* markers */
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

        /* dotted trail */
        arcsData={arcs}
        arcColor={(a: Arc) => a.color ?? "#00ffff"}
        arcAltitude={0.18}
        arcStroke={0.6}
        arcDashLength={0.08}
        arcDashGap={0.02}
        arcDashInitialGap={1}
        arcDashAnimateTime={1200}

        /* plane object */
        objectsData={plane ? [plane] : []}
        objectLat={(d: Plane) => d.lat}
        objectLng={(d: Plane) => d.lng}
        objectAltitude={(d: Plane) => d.alt}
        objectThreeObject={planeObjectFactory}

        atmosphereColor="#00ffff"
        atmosphereAltitude={0.15}

        animateIn={false}
        waitForGlobeReady
        onGlobeReady={() => {
          readySignal.current = true
          if (isMounted.current) setGlobeReady(true)
        }}
        enablePointerInteraction
      />

      {/* your HUD overlays stay the same */}
    </div>
  )
}
