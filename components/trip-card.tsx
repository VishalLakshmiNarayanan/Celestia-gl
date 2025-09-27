// components/trip-card.tsx
"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import type { ItineraryLeg, FlightOption } from "@/lib/types"

type Props = {
  fromName: string
  toName: string
  isLoading: boolean
  itinerary?: ItineraryLeg
  flights?: FlightOption[]
  onRefresh?: () => void
}

export default function TripCard({ fromName, toName, isLoading, itinerary, flights, onRefresh }: Props) {
  return (
    <div className="w-96 animate-in fade-in-0 zoom-in-95 duration-300">
      <Card className="bg-black/60 border-cyan-400/20 backdrop-blur-md p-4 rounded-xl text-cyan-100">
        <div className="mb-2">
          <div className="text-sm text-cyan-300/80">Trip plan</div>
          <div className="text-lg font-semibold">{fromName} → {toName}</div>
        </div>

        {isLoading && <div className="text-sm opacity-80">Planning route and fetching flights…</div>}

        {!isLoading && itinerary && (
          <div className="space-y-2 mb-3">
            <div className="text-sm opacity-80">
              Distance: <b>{itinerary.distance_km} km</b> • Est. time: <b>{itinerary.est_time_hr} hr</b>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {itinerary.steps.map((s, i) => (
                <li key={i} className="opacity-90">{s.label}{s.detail ? ` — ${s.detail}` : ""}</li>
              ))}
            </ol>
          </div>
        )}

        {!isLoading && flights && flights.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Top flight options</div>
            <ul className="space-y-2">
              {flights.slice(0,3).map((f, i) => (
                <li key={i} className="text-sm p-2 rounded-lg border border-cyan-400/20">
                  <div className="flex justify-between">
                    <span>{f.carrier} {f.flightNo} • {f.stops === 0 ? "Direct" : `${f.stops} stop`}</span>
                    {typeof f.priceUSD === "number" && <span>${f.priceUSD}</span>}
                  </div>
                  <div className="opacity-80">
                    {new Date(f.depart).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                    {" → "}
                    {new Date(f.arrive).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                    {" • "}
                    {Math.round(f.durationMin/60)}h {f.durationMin%60}m
                  </div>
                  <div className="opacity-60">{f.from} → {f.to}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isLoading && !itinerary && (
          <div className="text-sm opacity-70">Click two different markers to build a hop.</div>
        )}

        {onRefresh && (
          <button onClick={onRefresh} className="mt-3 text-xs underline opacity-80 hover:opacity-100">
            Refresh
          </button>
        )}
      </Card>
    </div>
  )
}
