"use server"

import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const placeName: string = body?.placeName ?? "This place"
    const lat: number | undefined = typeof body?.lat === "number" ? body.lat : undefined
    const lng: number | undefined = typeof body?.lng === "number" ? body.lng : undefined
    const facts: { title: string; description: string }[] = Array.isArray(body?.facts) ? body.facts : []
    const tone: string = body?.tone ?? "friendly"
    const length: string = body?.length ?? "short"

    const apiKey = process.env.GROQ_API_KEY || process.env.groq_api_key
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 })
    }

    const where = typeof lat === "number" && typeof lng === "number" ? ` at (${lat}, ${lng})` : ""
    const factsBlock = facts.length
      ? `\nFacts (optional):\n${facts.map((f) => `- ${f.title}: ${f.description}`).join("\n")}`
      : ""

    const prompt = `You are a friendly tour-guide mascot. Write a ${length} (2–4 sentences) spoken narration about "${placeName}"${where}.
Speak in FIRST PERSON as the mascot. Be concrete and helpful; avoid lists and generic fluff. If facts are provided, weave at most 1–2 naturally.
Tone: ${tone}.${factsBlock}
Return ONLY the narration text.`

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 220,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Groq error ${res.status}: ${text}` }, { status: 500 })
    }

    const data = await res.json()
    const narration = data?.choices?.[0]?.message?.content?.trim?.() || ""
    return NextResponse.json({ narration })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
