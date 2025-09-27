import { useRef, useState } from "react";

export type MarkerPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  iata?: string; // optional: nearest airport code if you have it
};

export function useTripSelection() {
  const prevRef = useRef<MarkerPoint | null>(null);
  const [current, setCurrent] = useState<MarkerPoint | null>(null);

  const select = (point: MarkerPoint) => {
    if (current) prevRef.current = current;
    setCurrent(point);
  };

  return {
    previous: prevRef.current,
    current,
    select,
    hasHop: !!prevRef.current && !!current && prevRef.current.id !== current.id,
  };
}
