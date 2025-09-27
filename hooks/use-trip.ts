// hooks/use-trip.ts
"use client"

import { useRef, useState } from "react"

export type TripPoint = { id: string; name: string; lat: number; lng: number; iata?: string }

export function useTripSelection() {
  const prevRef = useRef<TripPoint | null>(null)
  const [current, setCurrent] = useState<TripPoint | null>(null)

  const select = (p: TripPoint) => {
    if (current) prevRef.current = current
    setCurrent(p)
  }

  return {
    previous: prevRef.current,
    current,
    select,
    hasHop: !!prevRef.current && !!current && prevRef.current.id !== current.id,
  }
}
