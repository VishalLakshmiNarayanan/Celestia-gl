// components/mascot-narrator.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

type NarratorProps = {
  placeName: string
  lat: number
  lng: number
  facts?: { title: string; description: string }[]
  tone?: "friendly" | "curious" | "excited" | "calm"
  autoSpeak?: boolean
}

export default function MascotNarrator({
  placeName, lat, lng, facts = [], tone = "friendly", autoSpeak = true,
}: NarratorProps) {
  const [loading, setLoading] = useState(false)
  const [narration, setNarration] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [frame, setFrame] = useState(0) // 0..n to rotate mascot mouth frames
  const speakTimer = useRef<number | null>(null)
  const animTimer = useRef<number | null>(null)

  const mascotFrames = [
    "/mascot/cel1.png",
    "/mascot/cel2.png",
    "/mascot/cel3.png",
    "/mascot/cel4.png",
    "/mascot/cel5.png",
    "/mascot/cel6.png",
    "/mascot/cel7.png",
    "/mascot/cel8.png"
  ]
  const mascotIdle = "/mascot/neutral.png"

  async function fetchNarration() {
    setLoading(true)
    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeName, lat, lng, facts, tone, length: "short" }),
      })
      const data = await res.json()
      if (data?.narration) setNarration(data.narration)
    } finally {
      setLoading(false)
    }
  }

  function stopSpeech() {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    if (animTimer.current) window.clearInterval(animTimer.current)
    setFrame(0)
  }

  function speak(text: string) {
    if (!text) return
    stopSpeech()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.95
    utter.pitch = 1.05
    utter.volume = 0.9

    utter.onstart = () => {
      setIsSpeaking(true)
      animTimer.current = window.setInterval(() => {
        setFrame(f => (f + 1) % mascotFrames.length)
      }, 120)
    }
    utter.onend = () => {
      setIsSpeaking(false)
      if (animTimer.current) window.clearInterval(animTimer.current)
      setFrame(0)
    }
    utter.onerror = () => {
      setIsSpeaking(false)
      if (animTimer.current) window.clearInterval(animTimer.current)
      setFrame(0)
    }

    window.speechSynthesis.speak(utter)
  }

  useEffect(() => {
    fetchNarration()
    // stop TTS if this component unmounts
    return () => stopSpeech()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeName, lat, lng])

  useEffect(() => {
    if (autoSpeak && narration) {
      // small delay so UI renders first
      speakTimer.current = window.setTimeout(() => speak(narration), 300) as unknown as number
    }
    return () => {
      if (speakTimer.current) window.clearTimeout(speakTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narration])

  const currentImg = isSpeaking ? mascotFrames[frame] : mascotIdle

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-black/50 border border-white/10 shadow-xl">
      <div className="relative w-24 h-24 shrink-0">
        <Image
          src={currentImg}
          alt="Mascot"
          fill
          className="object-contain select-none"
          draggable={false}
          priority
        />
      </div>

      <div className="flex-1 space-y-3">
        <div className="rounded-xl p-3 bg-white/5 border border-white/10">
          <p className="text-sm leading-6">
            {loading ? "Thinking..." : (narration || "No narration yet.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => fetchNarration()} disabled={loading}>
            {loading ? "Generating…" : "Regenerate"}
          </Button>
          <Button size="sm" variant={isSpeaking ? "secondary" : "default"}
                  onClick={() => (isSpeaking ? stopSpeech() : speak(narration))}
                  disabled={!narration}>
            {isSpeaking ? "Stop" : "Speak"}
          </Button>
        </div>
      </div>
    </div>
  )
}
