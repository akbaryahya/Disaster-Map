"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { EarthquakeInfo } from "@/types/earthquake"

interface TsunamiWarningProps {
  earthquakes: EarthquakeInfo[]
  onViewEarthquake: (earthquake: EarthquakeInfo) => void
}

export function TsunamiWarning({ earthquakes, onViewEarthquake }: TsunamiWarningProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [showWarning, setShowWarning] = useState(false)

  // Filter earthquakes with tsunami warnings that haven't been dismissed
  const tsunamiEarthquakes = earthquakes.filter((quake) => quake.tsunami === 1 && !dismissedIds.has(quake._id))

  // Update warning visibility when tsunami earthquakes change
  useEffect(() => {
    setShowWarning(tsunamiEarthquakes.length > 0)
  }, [tsunamiEarthquakes.length])

  // Dismiss a specific tsunami warning
  const dismissWarning = (id: string) => {
    setDismissedIds((prev) => {
      const newSet = new Set(prev)
      newSet.add(id)
      return newSet
    })
  }

  if (!showWarning) return null

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
      {tsunamiEarthquakes.map((earthquake) => (
        <Card key={earthquake._id} className="mb-2 border-red-500 bg-red-50 dark:bg-red-950 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-700 dark:text-red-300">TSUNAMI WARNING</h3>
                  <p className="text-sm mt-1">
                    {earthquake.magnitude.toFixed(1)} {earthquake.type} earthquake near {earthquake.place} may generate
                    a tsunami.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline" className="bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700">
                      Source: {earthquake.source}
                    </Badge>
                    <Badge variant="outline" className="bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700">
                      {new Date(earthquake.time * 1000).toLocaleTimeString()}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => onViewEarthquake(earthquake)}>
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 dark:border-red-700"
                      onClick={() => dismissWarning(earthquake._id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500"
                onClick={() => dismissWarning(earthquake._id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
