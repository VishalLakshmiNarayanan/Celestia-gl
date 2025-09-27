import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs" // avoid some Edge fetch quirks
export const dynamic = "force-dynamic"

type Body = {
  location: string
  place?: string
  lat?: number
  lon?: number
  country?: string
}

const SYSTEM_PROMPT = `
You are a fascinating storyteller who reveals captivating facts about places. Output EXACTLY 6 facts in this JSON format:

{
  "facts": [
    {
      "category": "Famous For",
      "title": "Brief catchy title (≤8 words)",
      "description": "Fascinating detail (≤20 words)"
    },
    {
      "category": "Famous Spots Nearby", 
      "title": "Brief catchy title (≤8 words)",
      "description": "Fascinating detail (≤20 words)"
    },
    {
      "category": "Cultural Heritage",
      "title": "Brief catchy title (≤8 words)", 
      "description": "Fascinating detail (≤20 words)"
    },
    {
      "category": "Hidden Secrets",
      "title": "Brief catchy title (≤8 words)",
      "description": "Fascinating detail (≤20 words)"
    },
    {
      "category": "Record Breakers",
      "title": "Brief catchy title (≤8 words)",
      "description": "Fascinating detail (≤20 words)"
    },
    {
      "category": "Local Vibes",
      "title": "Brief catchy title (≤8 words)",
      "description": "Fascinating detail (≤20 words)"
    }
  ]
}

Rules:
- Focus on: bizarre records, hidden mysteries, surprising origins, cultural oddities, historical secrets
- Use vivid, engaging language that sparks curiosity
- Avoid generic travel tips and obvious facts
- If uncertain about a category, create something intriguing but plausible
- Output valid JSON only, no other text
`.trim()

export async function POST(req: NextRequest) {
  try {
    const { location, place, lat, lon, country } = (await req.json()) as Body
    const targetPlace = place || location

    if (!targetPlace) {
      return NextResponse.json({ error: "Missing 'location' or 'place'." }, { status: 400 })
    }
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 })
    }

    console.log("[v0] Generating facts for location:", targetPlace)

    const userPrompt = [
      `Place: ${targetPlace}${country ? ` (${country})` : ""}${lat && lon ? ` at ${lat}, ${lon}` : ""}.`,
      "Generate 6 fascinating facts about this place in the specified JSON format.",
      "Make each fact genuinely surprising and memorable, focusing on what makes this place unique.",
    ].join("\n")

    // Robust fetch with timeout + retries
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    }).catch((e) => {
      throw new Error(`Network to Groq failed: ${e?.message || e}`)
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Groq HTTP ${res.status}: ${text || res.statusText}`)
    }

    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content || ""

    console.log("[v0] Raw Groq response:", raw)

    try {
      const parsed = JSON.parse(raw)
      const categoryIcons: Record<string, string> = {
        "Famous For": "🌟",
        "Famous Spots Nearby": "📍",
        "Cultural Heritage": "🏛️",
        "Hidden Secrets": "🔍",
        "Record Breakers": "🏆",
        "Local Vibes": "🎭",
      }

      const facts = parsed.facts.map((fact: any, index: number) => ({
        id: `fact-${Date.now()}-${index}`,
        category: fact.category,
        title: fact.title,
        description: fact.description,
        icon: categoryIcons[fact.category] || "💫",
      }))

      console.log("[v0] Processed structured facts:", facts.length)

      return NextResponse.json({ facts }, { headers: { "Cache-Control": "no-store" } })
    } catch (parseError) {
      console.error("[v0] Failed to parse JSON response:", parseError)

      const lines = raw
        .split(/\r?\n/)
        .map((l: string) => l.replace(/^[-*\d.\s]+/, "").trim())
        .filter((l: string) => l.length > 0)
        .slice(0, 6)

      const fallbackFacts = lines.map((line: string, index: number) => ({
        id: `fact-${Date.now()}-${index}`,
        category:
          [
            "Famous For",
            "Famous Spots Nearby",
            "Cultural Heritage",
            "Hidden Secrets",
            "Record Breakers",
            "Local Vibes",
          ][index] || "Mystery",
        title: line.split(" ").slice(0, 6).join(" "),
        description: line,
        icon: ["🌟", "📍", "🏛️", "🔍", "🏆", "🎭"][index] || "💫",
      }))

      return NextResponse.json({ facts: fallbackFacts }, { headers: { "Cache-Control": "no-store" } })
    }
  } catch (err: any) {
    console.error("[v0] Error generating facts:", err?.message || err)
    return NextResponse.json({ error: "Failed to generate facts" }, { status: 500 })
  }
}
