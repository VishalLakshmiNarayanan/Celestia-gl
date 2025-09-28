// app/api/narrate/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { placeName, lat, lng, facts = [], tone = "friendly", length = "short" } = await req.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 })
    }

    const prompt = `
You are a friendly tour guide mascot. Write a ${length} (2–4 sentences) spoken narration about "${placeName}" at (${lat}, ${lng}).
Speak in FIRST PERSON as the mascot. Be concrete and helpful, avoid fluff.
If facts are provided, weave 1–2 into the narration naturally without listing them.

Facts (optional):
${facts.map((f: any) => `- ${f.title}: ${f.description}`).join("\n")}
Tone: ${tone}
Return ONLY the narration text.
    `.trim()

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // choose your Groq model
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
    const narration = data.choices?.[0]?.message?.content?.trim() || ""
    return NextResponse.json({ narration })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
