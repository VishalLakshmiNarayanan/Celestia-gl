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
  onTotalDistance?: (km: number) => void     // NEW: reports total distance
  clearSignal?: number                        // NEW: bump to force-clear flights
}

type Arc = { startLat: number; startLng: number; endLat: number; endLng: number; color?: string }
type Plane = { lat: number; lng: number; alt: number }

const EARTH_RADIUS_KM = 6371
const toRad = (x: number) => (x * Math.PI) / 180
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function GlobeComponent({
  markers,
  onMarkerClick,
  selectedMarkerId,
  onTotalDistance,
  clearSignal,
}: GlobeComponentProps) {
  const globeRef = useRef<any>(null)

  // prod-safe mount/ready guards
  const isMounted = useRef(false)
  const readySignal = useRef(false)
  const [globeReady, setGlobeReady] = useState(false)

  // flights
  const [arcs, setArcs] = useState<Arc[]>([])         // all past legs
  const [plane, setPlane] = useState<Plane | null>(null) // current leg only
  const flightRaf = useRef<number | null>(null)

  // mount bookkeeping
  useEffect(() => {
    isMounted.current = true
    if (readySignal.current && !globeReady) setGlobeReady(true)
    return () => {
      isMounted.current = false
      if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    }
  }, [globeReady])

  // separate camera spin/zoom (so preview == prod)
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

  // keeper: make sure autoRotate stays on in production
useEffect(() => {
  if (!globeRef.current || !globeReady) return;
  const controls = globeRef.current.controls?.();
  if (!controls) return;

  // Re-enable spin if something disables it.
  const id = setInterval(() => {
    const c = globeRef.current?.controls?.();
    if (c && !c.autoRotate) c.autoRotate = true;
  }, 2000);

  // Also re-enable on window focus
  const onFocus = () => {
    const c = globeRef.current?.controls?.();
    if (c) c.autoRotate = true;
  };
  window.addEventListener("focus", onFocus);

  return () => {
    clearInterval(id);
    window.removeEventListener("focus", onFocus);
  };
}, [globeReady]);


  // UX: nudge camera to latest marker (non-blocking)
  useEffect(() => {
    if (!globeRef.current || !globeReady || markers.length === 0) return
    const m = markers[markers.length - 1]
    globeRef.current.pointOfView({ lat: m.lat, lng: m.lng, altitude: 1.6 }, 1000)
  }, [markers.length, globeReady])

  // report total distance for Explorer Stats
  useEffect(() => {
    if (!onTotalDistance) return
    if (markers.length < 2) { onTotalDistance(0); return }
    let sum = 0
    for (let i = 1; i < markers.length; i++) sum += haversineKm(markers[i - 1], markers[i])
    onTotalDistance(Number(sum.toFixed(2)))
  }, [markers, onTotalDistance])

  // clear when markers go empty
  useEffect(() => {
    if (markers.length === 0) {
      if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
      setPlane(null)
      setArcs([])
    }
  }, [markers.length])

  // external clear trigger
  useEffect(() => {
    if (clearSignal === undefined) return
    if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    setPlane(null)
    setArcs([])
  }, [clearSignal])

  // start one leg (append trail; animate plane)
  const startFlight = (
    from: Marker,
    to: Marker,
    opts: { durationMs?: number; color?: string; arcAltitude?: number } = {}
  ) => {
    const duration = opts.durationMs ?? 3600
    const color = opts.color ?? "#00ffff"
    const arcAltitude = opts.arcAltitude ?? 0.28  // keep above horizon

    // keep existing arcs, append this leg
    setArcs(prev => [...prev, { startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng, color }])

    // animate plane along great-circle
    if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    const interp = geoInterpolate([from.lng, from.lat], [to.lng, to.lat])
    const t0 = performance.now()

    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / duration)
      const [lng, lat] = interp(t)
      // altitude hump so it never clips the globe
      const base = 0.04
      const peak = Math.min(arcAltitude, 0.32)
      const alt = base + Math.sin(Math.PI * t) * (peak - base)
      setPlane({ lat, lng, alt })
      if (t < 1) {
        flightRaf.current = requestAnimationFrame(tick)
      } else {
        flightRaf.current = null
        // optional: leave plane at destination or clear
        // setPlane(null)
      }
    }
    tick()

    // optional camera follow (independent from autorotate)
    globeRef.current?.pointOfView?.({ lat: from.lat, lng: from.lng, altitude: 1.8 }, 500)
    setTimeout(() => {
      globeRef.current?.pointOfView?.({ lat: to.lat, lng: to.lng, altitude: 1.8 }, Math.max(900, duration - 500))
    }, 500)
  }

  // automatically start previous->latest whenever a new marker is added
  useEffect(() => {
    if (!globeReady || markers.length < 2) return
    const from = markers[markers.length - 2]
    const to = markers[markers.length - 1]
    startFlight(from, to)
  }, [markers.length, globeReady])

  // quick console helpers (optional)
  ;(globalThis as any).__fly = (a: string, b: string) => {
    const from = markers.find(m => m.id === a)
    const to = markers.find(m => m.id === b)
    if (from && to) startFlight(from, to)
  }
  ;(globalThis as any).__clearFlights = () => {
    if (flightRaf.current) cancelAnimationFrame(flightRaf.current)
    setPlane(null)
    setArcs([])
  }

  // marker click
  const handleMarkerClick = (marker: Marker, event: any) => {
    const rect = (event?.target as HTMLElement)?.getBoundingClientRect?.()
    const position = rect
      ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
      : { x: 0, y: 0 }
    globeRef.current?.pointOfView?.({ lat: marker.lat, lng: marker.lng, altitude: 1.8 }, 900)
    onMarkerClick(marker, position)
  }

  // tiny cone plane (swap with sprite/GLTF if you want)
  const planeObjectFactory = useMemo(() => {
    const geom = new THREE.ConeGeometry(0.04, 0.12, 12)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    return () => {
      const mesh = new THREE.Mesh(geom, mat)
      mesh.rotateX(Math.PI / 2)
      return mesh
    }
  }, [])

  return (
    <div className="relative w-full h-full">
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

        /* dotted trails (history) */
        arcsData={arcs}
        arcColor={(a: Arc) => a.color ?? "#00ffff"}
        arcStroke={0.9}
        arcAltitude={() => 0.28}
        arcAltitudeAutoScale={false}
        arcCurveResolution={128}
        arcDashLength={0.08}
        arcDashGap={0.02}
        arcDashInitialGap={1}
        arcDashAnimateTime={1100}

        /* plane (current leg) */
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

      {/* overlays (unchanged) */}
    </div>
  )
}
