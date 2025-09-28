"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export type MascotNarratorProps = {
  placeName: string
  lat?: number
  lng?: number
  facts?: { title: string; description: string }[]
  tone?: "friendly" | "curious" | "excited" | "calm"
  autoSpeak?: boolean
}

export default function MascotNarrator({
  placeName,
  lat,
  lng,
  facts = [],
  tone = "friendly",
  autoSpeak = true,
}: MascotNarratorProps) {
  const [loading, setLoading] = useState(false)
  const [narration, setNarration] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [frame, setFrame] = useState(0)
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
        body: JSON.stringify({
          placeName,
          lat: typeof lat === "number" ? lat : undefined,
          lng: typeof lng === "number" ? lng : undefined,
          facts,
          tone,
          length: "short",
        }),
      })
      const data = await res.json()
      if (data?.narration) setNarration(data.narration)
      else setNarration("")
    } finally {
      setLoading(false)
    }
  }

  function stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    if (animTimer.current) window.clearInterval(animTimer.current)
    setFrame(0)
  }

  function speak(text: string) {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return
    stopSpeech()
    const utterance = new SpeechSynthesisUtterance(text)
utterance.rate = 0.95
utterance.pitch = 1.05
utterance.volume = 0.9

// try to pick a female voice
const voices = window.speechSynthesis.getVoices()
const female = voices.find(v =>
  /female|woman|zira|susan|samantha|victoria/i.test(v.name)
)
if (female) {
  utterance.voice = female
}


    utter.onstart = () => {
      setIsSpeaking(true)
      animTimer.current = window.setInterval(() => setFrame((f) => (f + 1) % mascotFrames.length), 120)
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
    return () => stopSpeech()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeName, lat, lng])

  useEffect(() => {
    if (autoSpeak && narration) {
      speakTimer.current = window.setTimeout(() => speak(narration), 300) as unknown as number
    }
    return () => {
      if (speakTimer.current) window.clearTimeout(speakTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narration])

  const currentImg = isSpeaking ? mascotFrames[frame] : mascotIdle

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-black/40 border border-cyan-400/30">
      <div className="relative w-20 h-20 shrink-0">
        <Image src={currentImg} alt="Mascot" fill className="object-contain select-none" draggable={false} />
      </div>
      <div className="flex-1 space-y-3">
        <div className="rounded-xl p-3 bg-white/5 border border-white/10">
          <p className="text-sm leading-6">{loading ? "Thinking…" : narration || "No narration yet."}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetchNarration} disabled={loading}>
            {loading ? "Generating…" : "Regenerate"}
          </Button>
          <Button
            size="sm"
            variant={isSpeaking ? "secondary" : "default"}
            disabled={!narration}
            onClick={() => (isSpeaking ? stopSpeech() : speak(narration))}
          >
            {isSpeaking ? "Stop" : "Speak"}
          </Button>
        </div>
      </div>
    </div>
  )
}
