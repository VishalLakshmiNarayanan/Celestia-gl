"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { X, MapPin, Clock, Sparkles, Play, Pause, MessageSquare } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import MascotNarrator from "@/components/mascot-narrator"
import type { Marker, FactCard } from "@/lib/types"

interface HologramCardProps {
  marker: Marker
  position: { x: number; y: number } // click location for initial placement
  onClose: () => void
  isVisible: boolean
}

/* -------------------- Draggable panel hook (safe) -------------------- */
function useDraggable(initial: { left: number; top: number }) {
  const [pos, setPos] = useState(initial)
  const [z, setZ] = useState(1)

  // store active drag info
  const stateRef = useRef<{
    el: HTMLElement | null
    pointerId: number | null
    startX: number
    startY: number
    startLeft: number
    startTop: number
    onMove?: (ev: PointerEvent) => void
    onUp?: (ev: PointerEvent) => void
  } | null>(null)

  function clamp(x: number, y: number, w: number, h: number, margin = 8) {
    const maxL = Math.max(margin, window.innerWidth - w - margin)
    const maxT = Math.max(margin, window.innerHeight - h - margin)
    return {
      left: Math.min(Math.max(margin, x), maxL),
      top: Math.min(Math.max(margin, y), maxT),
    }
  }

  function onPointerDown(
    e: React.PointerEvent,
    getSize: () => { w: number; h: number },
    bringToFront?: () => void
  ) {
    const el = e.currentTarget as HTMLElement | null
    if (!el) return
    e.preventDefault()
    ;(el as any).style.touchAction = "none" // smoother touch drag

    const { w, h } = getSize()
    const startLeft = pos.left
    const startTop = pos.top
    const startX = e.clientX
    const startY = e.clientY
    const pointerId = e.pointerId

    // capture if available
    try {
      el.setPointerCapture?.(pointerId)
    } catch {
      /* ignore */
    }

    // z-index bump
    setZ((v) => v + 1)
    bringToFront?.()

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const next = clamp(startLeft + dx, startTop + dy, w, h)
      setPos(next)
    }

    const up = (_ev: PointerEvent) => {
      try {
        if (el && typeof el.hasPointerCapture === "function" && el.hasPointerCapture(pointerId)) {
          el.releasePointerCapture?.(pointerId)
        }
      } catch {
        /* ignore */
      }
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      if (stateRef.current) stateRef.current.el = null
    }

    stateRef.current = { el, pointerId, startX, startY, startLeft, startTop, onMove: move, onUp: up }

    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerup", up, { passive: true })
    window.addEventListener("pointercancel", up, { passive: true })
  }

  // Cleanup if unmounted mid-drag
  useEffect(() => {
    return () => {
      const s = stateRef.current
      if (s) {
        window.removeEventListener("pointermove", s.onMove as any)
        window.removeEventListener("pointerup", s.onUp as any)
        window.removeEventListener("pointercancel", s.onUp as any)
        try {
          if (s.el && s.pointerId != null && s.el.hasPointerCapture?.(s.pointerId)) {
            s.el.releasePointerCapture?.(s.pointerId)
          }
        } catch { /* ignore */ }
      }
    }
  }, [])

  return { pos, setPos, onPointerDown, z }
}

/* -------------------- Shared chrome for a floating card -------------------- */
function PanelChrome({
  title,
  right,
  children,
  onClose,
  initialLeft,
  initialTop,
  minW = "min-w-[20rem]",
  maxW = "max-w-[96vw]",
  maxH = "max-h-[80vh]",
}: {
  title: React.ReactNode
  right?: React.ReactNode
  children: React.ReactNode
  onClose: () => void
  initialLeft: number
  initialTop: number
  minW?: string
  maxW?: string
  maxH?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const { pos, setPos, onPointerDown, z } = useDraggable({ left: initialLeft, top: initialTop })

  const getSize = () => {
    const rect = wrapRef.current?.getBoundingClientRect()
    return { w: rect?.width ?? 360, h: rect?.height ?? 320 }
  }

  // ensure starting position is inside viewport (use state, not direct assignment)
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const m = 8
    const left = Math.min(Math.max(m, pos.left), Math.max(m, window.innerWidth - rect.width - m))
    const top = Math.min(Math.max(m, pos.top), Math.max(m, window.innerHeight - rect.height - m))
    if (left !== pos.left || top !== pos.top) {
      setPos({ left, top })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 1000 + z }}
      className={`animate-in fade-in-0 zoom-in-95 duration-300 w-auto ${minW} ${maxW}`}
    >
      <Card
        className={`relative bg-black/20 backdrop-blur-xl border-cyan-400/30 shadow-2xl shadow-cyan-400/20 overflow-hidden hologram-flicker ${maxH} flex flex-col`}
      >
        {/* Drag handle = header bar */}
        <div
          className="relative p-4 border-b border-cyan-400/20 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={(e) => onPointerDown(e, getSize, () => {})}
          title="Drag to move"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-cyan-100">{title}</div>
            <div className="flex items-center gap-2">
              {right}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-6 w-6 p-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {children}

        {/* Holographic border effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-cyan-400/60" />
          <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-cyan-400/60" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-cyan-400/60" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-cyan-400/60" />
          <div className="absolute inset-0 rounded-lg border border-cyan-400/20 animate-pulse" />
        </div>
      </Card>
    </div>
  )
}

/* -------------------- Main: three movable, auto-sized cards -------------------- */
export function HologramCard({ marker, position, onClose, isVisible }: HologramCardProps) {
  const [selectedFact, setSelectedFact] = useState<FactCard | null>(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentFactIndex, setCurrentFactIndex] = useState(0)
  const [mascotMode, setMascotMode] = useState(true)

  if (!isVisible) return null

  // safe coords
  const lat =
    (marker as any)?.position?.lat ??
    (marker as any)?.lat ??
    (marker as any)?.coords?.lat ??
    null
  const lng =
    (marker as any)?.position?.lng ??
    (marker as any)?.lng ??
    (marker as any)?.coords?.lng ??
    null
  const hasCoords = typeof lat === "number" && typeof lng === "number"

  // videos auto-rotate
  useEffect(() => {
    if (!selectedFact && (marker.videos?.length ?? 0) > 1) {
      const id = setInterval(() => {
        setCurrentVideoIndex((p) => (p + 1) % (marker.videos?.length ?? 1))
      }, 8000)
      return () => clearInterval(id)
    }
  }, [marker.videos?.length, selectedFact])

  // autoplay loaded video
  useEffect(() => {
    const el = document.querySelector(".hologram-video") as HTMLVideoElement | null
    if (el && isVideoLoaded) el.play().catch(() => {})
  }, [currentVideoIndex, isVideoLoaded, selectedFact])

  // female voice chooser
  const pickFemaleVoice = () => {
    const voices = window.speechSynthesis.getVoices()
    return (
      voices.find((v) => /female|woman|zira|susan|samantha|victoria|eva|sofia|natalia|karen|moira/i.test(v.name)) ||
      voices.find((v) => /en(-|_)?(us|gb|au|in)/i.test(v.lang)) ||
      undefined
    )
  }

  const speakFacts = () => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()

    if (isSpeaking) {
      setIsSpeaking(false)
      return
    }
    setIsSpeaking(true)
    setCurrentFactIndex(0)

    const speakFact = (index: number) => {
      const facts = marker.facts || []
      if (index >= facts.length) {
        setIsSpeaking(false)
        setCurrentFactIndex(0)
        return
      }
      const fact = facts[index]
      const utter = new SpeechSynthesisUtterance(`${fact.title}. ${fact.description}`)
      utter.rate = 0.95
      utter.pitch = 1.05
      utter.volume = 0.9
      const v = pickFemaleVoice()
      if (v) utter.voice = v
      else window.speechSynthesis.onvoiceschanged = () => {
        const vv = pickFemaleVoice()
        if (vv) utter.voice = vv
      }
      utter.onstart = () => setCurrentFactIndex(index)
      utter.onend = () => setTimeout(() => speakFact(index + 1), 500)
      utter.onerror = () => {
        setIsSpeaking(false)
        setCurrentFactIndex(0)
      }
      window.speechSynthesis.speak(utter)
    }

    speakFact(0)
  }

  // initial positions (based on click)
  const baseL = Math.min(Math.max(16, position.x), window.innerWidth - 340)
  const baseT = Math.min(Math.max(16, position.y), window.innerHeight - 260)

  const currentVideo = selectedFact?.video || marker.videos?.[currentVideoIndex]

  return (
    <>
      {/* Video Panel */}
      <PanelChrome
        onClose={onClose}
        initialLeft={baseL}
        initialTop={baseT}
        minW="min-w-[22rem]"
        maxW="max-w-[96vw]"
        maxH="max-h-[80vh]"
        title={
          <>
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm">{(marker as any)?.name ?? "Unknown place"}</span>
          </>
        }
        right={
          <div className="hidden md:flex items-center gap-2 text-xs text-cyan-400/70">
            <Clock className="w-3 h-3" />
            <span>Added {new Date((marker as any)?.timestamp ?? Date.now()).toLocaleDateString()}</span>
          </div>
        }
      >
        {currentVideo ? (
          <div className="relative aspect-video bg-black/40">
            <video
              className="hologram-video w-full h-full object-cover"
              src={(currentVideo as any)?.url}
              loop
              muted
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
              onError={() => setIsVideoLoaded(false)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {!selectedFact && (marker.videos?.length ?? 0) > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-cyan-400 text-xs px-2 py-1 rounded">
                {currentVideoIndex + 1} / {marker.videos?.length}
              </div>
            )}
            {selectedFact && (
              <div className="absolute bottom-2 left-2 bg-black/60 text-cyan-400 text-xs px-2 py-1 rounded">
                {selectedFact.category}
              </div>
            )}
            {!isVideoLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-sm text-cyan-200/80">No video available.</div>
        )}
      </PanelChrome>

      {/* Discovery Cards Panel */}
      <PanelChrome
        onClose={onClose}
        initialLeft={baseL + 380}
        initialTop={baseT}
        minW="min-w-[26rem]"
        maxW="max-w-[98vw]"
        maxH="max-h-[80vh]"
        title={
          <>
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm">Discovery Cards</span>
          </>
        }
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={speakFacts}
            className={`text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-6 w-6 p-0 ${
              isSpeaking ? "animate-pulse bg-cyan-400/20" : ""
            }`}
            title={isSpeaking ? "Stop narration" : "Listen to facts"}
          >
            {isSpeaking ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
        }
      >
        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {(marker.facts || []).map((fact, index) => (
              <div
                key={(fact as any)?.id ?? `${index}`}
                onClick={() => setSelectedFact(selectedFact?.id === (fact as any)?.id ? null : (fact as any))}
                className={`cursor-pointer p-3 rounded-lg border transition-all duration-300 hover:scale-105 ${
                  selectedFact?.id === (fact as any)?.id
                    ? "bg-cyan-400/20 border-cyan-400/60 shadow-lg shadow-cyan-400/20"
                    : isSpeaking && index === currentFactIndex
                      ? "bg-cyan-400/15 border-cyan-400/50"
                      : "bg-cyan-400/5 border-cyan-400/20 hover:bg-cyan-400/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{(fact as any)?.icon}</span>
                  <span className="text-cyan-300 text-xs font-medium">{(fact as any)?.category}</span>
                </div>
                <h4 className="text-cyan-100 text-xs font-semibold mb-1 line-clamp-2">
                  {(fact as any)?.title}
                </h4>
                <p className="text-cyan-100/80 text-xs leading-relaxed line-clamp-3">
                  {(fact as any)?.description}
                </p>
                {(fact as any)?.video && (
                  <div className="mt-2 flex items-center gap-1 text-cyan-400/70 text-xs">
                    <Play className="w-3 h-3" />
                    <span>Video</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedFact && (
            <div className="mt-3 p-3 bg-cyan-400/10 rounded-lg border border-cyan-400/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{selectedFact.icon}</span>
                <span className="text-cyan-300 text-sm font-medium">{selectedFact.category}</span>
              </div>
              <h4 className="text-cyan-100 text-sm font-semibold mb-2">{selectedFact.title}</h4>
              <p className="text-cyan-100/90 text-sm leading-relaxed">{selectedFact.description}</p>
            </div>
          )}
        </div>
      </PanelChrome>

      {/* Narration Panel */}
      <PanelChrome
        onClose={onClose}
        initialLeft={baseL + 760}
        initialTop={baseT}
        minW="min-w-[22rem]"
        maxW="max-w-[98vw]"
        maxH="max-h-[70vh]"
        title={
          <>
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm">Mascot Narration</span>
          </>
        }
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMascotMode((v) => !v)}
            className={`h-6 px-2 text-cyan-100 hover:text-cyan-50 hover:bg-cyan-400/10 ${
              mascotMode ? "bg-cyan-400/20" : ""
            }`}
            title="Toggle mascot narration"
          >
            {mascotMode ? "On" : "Off"}
          </Button>
        }
      >
        <div className="p-4">
          {mascotMode ? (
            hasCoords ? (
              <MascotNarrator
                placeName={(marker as any)?.name ?? "This place"}
                lat={lat as number}
                lng={lng as number}
                facts={(marker.facts || []).map((f: any) => ({
                  title: f.title,
                  description: f.description,
                }))}
                tone="friendly"
                autoSpeak={true}
              />
            ) : (
              <div className="text-[12px] text-cyan-300/80 bg-black/30 border border-cyan-400/30 rounded px-2 py-1">
                Missing coordinates for this marker — mascot narration hidden.
              </div>
            )
          ) : (
            <div className="text-sm text-cyan-200/80">Turn on to hear your mascot speak.</div>
          )}
        </div>
      </PanelChrome>
    </>
  )
}
