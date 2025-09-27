export interface Location {
  name: string
  lat: number
  lng: number
  country: string
  city: string
  type: string
}

export interface Marker {
  id: string
  lat: number
  lng: number
  name: string
  facts: FactCard[]
  videos: Video[]
  timestamp: number
}

export interface FactCard {
  id: string
  category: string
  title: string
  description: string
  video?: Video
  icon: string
}

export interface Video {
  id: string
  url: string
  thumbnail: string
  duration: number
}

export interface HologramCardData {
  marker: Marker
  isVisible: boolean
  position: { x: number; y: number }
}

export type ItineraryLeg = {
  from: { name: string; lat: number; lng: number; code?: string };
  to:   { name: string; lat: number; lng: number; code?: string };
  distance_km: number;
  est_time_hr: number;        // rough flight time or total time
  steps: Array<{ label: string; detail?: string }>;
};

export type FlightOption = {
  carrier: string;
  flightNo: string;
  depart: string; // ISO
  arrive: string; // ISO
  durationMin: number;
  priceUSD?: number;
  stops: number;
  from: string; // IATA
  to: string;   // IATA
};
