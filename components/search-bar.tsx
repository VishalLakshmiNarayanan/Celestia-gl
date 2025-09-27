"use client"

import type React from "react"

import { useState } from "react"
import { Search, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Location } from "@/lib/types"
import { geocodeLocation } from "@/lib/api"

interface SearchBarProps {
  onLocationSelect: (location: Location) => void
}

export function SearchBar({ onLocationSelect }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const locations = await geocodeLocation(query)
      setResults(locations)
      setShowResults(true)
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationClick = (location: Location) => {
    onLocationSelect(location)
    setShowResults(false)
    setQuery("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search for a location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 bg-black/40 border-cyan-400/30 text-cyan-100 placeholder:text-cyan-400/60 focus:border-cyan-400 focus:ring-cyan-400/20"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-cyan-600 hover:bg-cyan-500 text-black font-medium"
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full bg-black/90 border-cyan-400/30 backdrop-blur-sm z-50">
          <div className="p-2 max-h-60 overflow-y-auto">
            {results.map((location, index) => (
              <button
                key={index}
                onClick={() => handleLocationClick(location)}
                className="w-full text-left p-3 hover:bg-cyan-400/10 rounded-md transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-cyan-100 font-medium group-hover:text-cyan-300 text-sm">
                      {location.city || location.name.split(",")[0]}
                    </div>
                    <div className="text-cyan-400/70 text-xs mt-1 line-clamp-2">{location.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
