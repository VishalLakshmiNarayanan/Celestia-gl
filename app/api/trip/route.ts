import { NextResponse } from "next/server";
import type { ItineraryLeg, FlightOption } from "@/lib/types";

function haversineKm(a: {lat:number;lng:number}, b:{lat:number;lng:number}) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI/180;
  const dLon = (b.lng - a.lng) * Math.PI/180;
  const la1 = a.lat * Math.PI/180;
  const la2 = b.lat * Math.PI/180;
  const sin = Math.sin;
  const cos = Math.cos;
  const h = sin(dLat/2)**2 + cos(la1)*cos(la2)*sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function POST(req: Request) {
  try {
    const { from, to } = await req.json() as {
      from: { name:string; lat:number; lng:number; iata?:string };
      to:   { name:string; lat:number; lng:number; iata?:string };
    };

    if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

    const distance_km = Math.round(haversineKm(from, to));
    const est_time_hr = +(Math.max(1, distance_km / 750)).toFixed(1); // ~cruise speed roughness

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
    };

    // --- MOCK FLIGHTS (replace with real provider later) ---
    const now = new Date();
    const in3h = new Date(now.getTime() + 3*60*60*1000);
    const in6h = new Date(now.getTime() + 6*60*60*1000);
    const in9h = new Date(now.getTime() + 9*60*60*1000);

    const flights: FlightOption[] = [
      {
        carrier: "SkyJet", flightNo: "SJ211",
        depart: now.toISOString(), arrive: new Date(now.getTime() + est_time_hr*60*60*1000).toISOString(),
        durationMin: Math.round(est_time_hr*60), priceUSD: 199 + Math.round(distance_km/20),
        stops: 0, from: from.iata || "XXX", to: to.iata || "YYY"
      },
      {
        carrier: "AeroMax", flightNo: "AM834",
        depart: in3h.toISOString(), arrive: new Date(in3h.getTime() + est_time_hr*60*60*1000).toISOString(),
        durationMin: Math.round(est_time_hr*60) + 45, priceUSD: 179 + Math.round(distance_km/25),
        stops: 1, from: from.iata || "XXX", to: to.iata || "YYY"
      },
      {
        carrier: "NimbusAir", flightNo: "NB502",
        depart: in6h.toISOString(), arrive: in9h.toISOString(),
        durationMin: (9-6)*60, priceUSD: 149 + Math.round(distance_km/28),
        stops: 1, from: from.iata || "XXX", to: to.iata || "YYY"
      }
    ];

    return NextResponse.json({ itinerary, flights });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "trip error" }, { status: 500 });
  }
}
