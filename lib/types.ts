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
