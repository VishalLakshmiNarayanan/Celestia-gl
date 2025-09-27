"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { ItineraryLeg, FlightOption } from "@/lib/types"
import { Button } from "@/components/ui/button"

// If your Discovery card uses utility animations, reuse them here on the wrapper.
// (We also keep the card compact & crisp like your India card.)
type Props = {
  fromName: string
  toName: string
  isLoading: boolean
  itinerary?: ItineraryLeg
  flights?: FlightOption[]
  flightsUrl?: string
  onRefresh?: () => void
  onClose?: () => void
}

export default function TripCard({
  fromName, toName, isLoading, itinerary, flights, flightsUrl, onRefresh, onClose
}: Props) {
  const [tab, setTab] = React.useState<"plan"|"flights">("plan")

  return (
    <div className="w-[420px] animate-in fade-in-0 zoom-in-95 duration-300">
      <Card className="bg-[linear-gradient(180deg,rgba(10,14,20,0.9)_0%,rgba(8,14,22,0.75)_100%)] border-cyan-400/20 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-400/10">
          <div className="space-y-0.5">
            <div className="text-xs text-cyan-300/70">Trip plan</div>
            <div className="text-lg font-semibold text-cyan-100">{fromName} → {toName}</div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-cyan-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-3 pt-2">
          <div className="inline-flex rounded-xl border border-cyan-400/20 p-1 bg-black/20">
            <button
              onClick={()=>setTab("plan")}
              className={`px-3 py-1.5 text-sm rounded-lg transition
                ${tab==="plan" ? "bg-cyan-400/20 text-cyan-100" : "text-cyan-300/70 hover:text-cyan-100"}`}
            >
              Itinerary
            </button>
            <button
              onClick={()=>setTab("flights")}
              className={`px-3 py-1.5 text-sm rounded-lg transition
                ${tab==="flights" ? "bg-cyan-400/20 text-cyan-100" : "text-cyan-300/70 hover:text-cyan-100"}`}
            >
              Flights
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 max-h-[60vh] overflow-auto custom-scroll">
          {isLoading && (
            <p className="text-sm text-cyan-100/80">Planning route and fetching flights…</p>
          )}

          {!isLoading && tab==="plan" && itinerary && (
            <div className="space-y-3">
              <div className="text-sm text-cyan-200">
                Distance: <b className="text-cyan-100">{itinerary.distance_km.toLocaleString()} km</b>
                {" • "}
                Est. time: <b className="text-cyan-100">{itinerary.est_time_hr} hr</b>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-cyan-100/90">
                {itinerary.steps.map((s, i) => (
                  <li key={i}>{s.label}{s.detail ? ` — ${s.detail}` : ""}</li>
                ))}
              </ol>
            </div>
          )}

          {!isLoading && tab==="flights" && flights && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-cyan-200">Top flight options</div>
                {flightsUrl && (
                  <a
                    href={flightsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline text-cyan-300/90 hover:text-cyan-100"
                  >
                    Open in Google Flights
                  </a>
                )}
              </div>
              <ul className="space-y-2">
                {flights.slice(0,3).map((f, i) => (
                  <li key={i} className="p-3 rounded-xl border border-cyan-400/20 bg-black/20">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-100">{f.carrier} {f.flightNo} • {f.stops===0 ? "Direct" : `${f.stops} stop`}</span>
                      {"priceUSD" in f && typeof f.priceUSD==="number" && (
                        <span className="text-cyan-200">${f.priceUSD}</span>
                      )}
                    </div>
                    <div className="text-sm text-cyan-200/80">
                      {new Date(f.depart).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                      {" → "}
                      {new Date(f.arrive).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                      {" • "}
                      {Math.floor(f.durationMin/60)}h {f.durationMin%60}m
                    </div>
                    <div className="text-xs text-cyan-300/70 tracking-wide">{f.from} → {f.to}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isLoading && !itinerary && (
            <p className="text-sm text-cyan-100/70">Pick two different markers to build a hop.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 border-t border-cyan-400/10">
          {onRefresh && (
            <Button variant="ghost" size="sm" className="text-cyan-200 hover:text-cyan-100" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
