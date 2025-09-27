// app/api/trip/route.ts
import { NextResponse } from "next/server"
import type { ItineraryLeg, FlightOption } from "@/lib/types"

function haversineKm(a:{lat:number;lng:number}, b:{lat:number;lng:number}) {
  const R = 6371, toRad = (d:number)=>d*Math.PI/180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const la1 = toRad(a.lat), la2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2
  return 2*R*Math.asin(Math.sqrt(h))
}

export async function POST(req: Request) {
  try {
    const { from, to } = await req.json() as {
      from: { name:string; lat:number; lng:number; iata?:string }
      to:   { name:string; lat:number; lng:number; iata?:string }
    }
    if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 })

    const distance_km = Math.round(haversineKm(from, to))
    const est_time_hr = +(Math.max(1, distance_km / 750)).toFixed(1)

    const itinerary: ItineraryLeg = {
      from: { name: from.name, lat: from.lat, lng: from.lng, code: from.iata },
      to:   { name: to.name,   lat: to.lat,   lng: to.lng,   code: to.iata },
      distance_km,
      est_time_hr,
      steps: [
        { label: `Depart ${from.name}${from.iata ? ` (${from.iata})` : ""}` },
        { label: `Fly ~${distance_km} km (~${est_time_hr} hr)` },
        { label: `Arrive ${to.name}${to.iata ? ` (${to.iata})` : ""}` },
      ],
    }

    const now = new Date()
    const mk = (offsetH:number) => new Date(now.getTime() + offsetH*3600*1000)
    const flights: FlightOption[] = [
      { carrier:"SkyJet",  flightNo:"SJ211", depart: now.toISOString(),
        arrive: new Date(now.getTime()+est_time_hr*3600*1000).toISOString(),
        durationMin: Math.round(est_time_hr*60), priceUSD: 199 + Math.round(distance_km/20),
        stops:0, from: from.iata||"XXX", to: to.iata||"YYY" },
      { carrier:"AeroMax", flightNo:"AM834", depart: mk(3).toISOString(),
        arrive: new Date(mk(3).getTime()+est_time_hr*3600*1000).toISOString(),
        durationMin: Math.round(est_time_hr*60)+45, priceUSD: 179 + Math.round(distance_km/25),
        stops:1, from: from.iata||"XXX", to: to.iata||"YYY" },
      { carrier:"NimbusAir", flightNo:"NB502", depart: mk(6).toISOString(),
        arrive: mk(9).toISOString(), durationMin: 180, priceUSD: 149 + Math.round(distance_km/28),
        stops:1, from: from.iata||"XXX", to: to.iata||"YYY" },
    ]

    return NextResponse.json({ itinerary, flights })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "trip error" }, { status: 500 })
  }
}
