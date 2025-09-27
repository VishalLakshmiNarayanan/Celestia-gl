"use client"

import { useEffect, useRef, useState } from "react"
import { X, MapPin, Clock, Sparkles, Play, Pause } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Marker, FactCard } from "@/lib/types"

interface HologramCardProps {
  marker: Marker
  position: { x: number; y: number }
  onClose: () => void
  isVisible: boolean
}

export function HologramCard({ marker, position, onClose, isVisible }: HologramCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [selectedFact, setSelectedFact] = useState<FactCard | null>(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentFactIndex, setCurrentFactIndex] = useState(0)

  // Auto-cycle through videos if no specific fact is selected
  useEffect(() => {
    if (!selectedFact && marker.videos.length > 1) {
      const interval = setInterval(() => {
        setCurrentVideoIndex((prev) => (prev + 1) % marker.videos.length)
      }, 8000)
      return () => clearInterval(interval)
    }
  }, [marker.videos.length, selectedFact])

  // Auto-play video when loaded
  useEffect(() => {
    const videoElement = document.querySelector(".hologram-video") as HTMLVideoElement
    if (videoElement && isVideoLoaded) {
      videoElement.play().catch(console.error)
    }
  }, [currentVideoIndex, isVideoLoaded, selectedFact])

  useEffect(() => {
    if (!isVisible && isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setCurrentFactIndex(0)
    }
  }, [isVisible, isSpeaking])

  // Position the card near the clicked marker
  const cardStyle = {
    position: "fixed" as const,
    left: Math.min(position.x + 20, window.innerWidth - 420),
    top: Math.min(position.y - 100, window.innerHeight - 600),
    zIndex: 1000,
  }

  // Get current video - either from selected fact or general videos
  const currentVideo = selectedFact?.video || marker.videos[currentVideoIndex]

  if (!isVisible) return null

  const speakFacts = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()

      if (isSpeaking) {
        setIsSpeaking(false)
        return
      }

      setIsSpeaking(true)
      setCurrentFactIndex(0)

      const speakFact = (index: number) => {
        if (index >= marker.facts.length) {
          setIsSpeaking(false)
          setCurrentFactIndex(0)
          return
        }

        const fact = marker.facts[index]
        const text = `${fact.title}. ${fact.description}`
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1.1
        utterance.volume = 0.8

        utterance.onstart = () => setCurrentFactIndex(index)
        utterance.onend = () => {
          setTimeout(() => speakFact(index + 1), 500)
        }
        utterance.onerror = () => {
          setIsSpeaking(false)
          setCurrentFactIndex(0)
        }

        window.speechSynthesis.speak(utterance)
      }

      speakFact(0)
    }
  }

  return (
    <div ref={cardRef} style={cardStyle} className="w-96 animate-in fade-in-0 zoom-in-95 duration-300">
      <Card className="bg-black/20 backdrop-blur-xl border-cyan-400/30 shadow-2xl shadow-cyan-400/20 overflow-hidden hologram-flicker">
        {/* Header */}
        <div className="relative p-4 border-b border-cyan-400/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h3 className="text-cyan-100 font-semibold text-sm line-clamp-2">{marker.name}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 mt-2 text-xs text-cyan-400/70">
            <Clock className="w-3 h-3" />
            <span>Added {new Date(marker.timestamp).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Video Section */}
        {currentVideo && (
          <div className="relative aspect-video bg-black/40">
            <video
              className="hologram-video w-full h-full object-cover"
              src={currentVideo.url}
              loop
              muted
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
              onError={() => setIsVideoLoaded(false)}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Video indicator */}
            {!selectedFact && marker.videos.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-cyan-400 text-xs px-2 py-1 rounded">
                {currentVideoIndex + 1} / {marker.videos.length}
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
        )}

        {/* Facts Section */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-300 font-medium text-sm">Discovery Cards</span>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {marker.facts.map((fact, index) => (
              <div
                key={fact.id}
                onClick={() => setSelectedFact(selectedFact?.id === fact.id ? null : fact)}
                className={`cursor-pointer p-3 rounded-lg border transition-all duration-300 hover:scale-105 ${
                  selectedFact?.id === fact.id
                    ? "bg-cyan-400/20 border-cyan-400/60 shadow-lg shadow-cyan-400/20"
                    : isSpeaking && index === currentFactIndex
                      ? "bg-cyan-400/15 border-cyan-400/50"
                      : "bg-cyan-400/5 border-cyan-400/20 hover:bg-cyan-400/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{fact.icon}</span>
                  <span className="text-cyan-300 text-xs font-medium">{fact.category}</span>
                </div>
                <h4 className="text-cyan-100 text-xs font-semibold mb-1 line-clamp-2">{fact.title}</h4>
                <p className="text-cyan-100/80 text-xs leading-relaxed line-clamp-3">{fact.description}</p>
                {fact.video && (
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
