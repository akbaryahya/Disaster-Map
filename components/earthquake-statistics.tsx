"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"

interface EarthquakeStatisticsProps {
  earthquakes: any[]
  filteredEarthquakes: any[]
}

// Define magnitude categories
const MAGNITUDE_CATEGORIES = [
  { name: "Minor", range: [0, 2], color: "bg-green-500" },
  { name: "Light", range: [2, 4], color: "bg-yellow-500" },
  { name: "Moderate", range: [4, 6], color: "bg-orange-500" },
  { name: "Strong", range: [6, 7], color: "bg-red-500" },
  { name: "Major", range: [7, 8], color: "bg-red-600" },
  { name: "Great", range: [8, 10], color: "bg-red-700" },
]

export function EarthquakeStatistics({ earthquakes, filteredEarthquakes }: EarthquakeStatisticsProps) {
  // Calculate statistics for all earthquakes
  const allStats = useMemo(() => {
    return MAGNITUDE_CATEGORIES.map((category) => {
      const count = earthquakes.filter((quake) => {
        const mag = quake.properties.mag
        return mag >= category.range[0] && mag < category.range[1]
      }).length
      return { ...category, count }
    })
  }, [earthquakes])

  // Calculate statistics for filtered earthquakes
  const filteredStats = useMemo(() => {
    return MAGNITUDE_CATEGORIES.map((category) => {
      const count = filteredEarthquakes.filter((quake) => {
        const mag = quake.properties.mag
        return mag >= category.range[0] && mag < category.range[1]
      }).length
      return { ...category, count }
    })
  }, [filteredEarthquakes])

  // Find the maximum count for scaling the bars
  const maxCount = Math.max(...allStats.map((stat) => stat.count))

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Earthquake Statistics</h3>

      <div className="space-y-3">
        {MAGNITUDE_CATEGORIES.map((category, index) => {
          const allCount = allStats[index].count
          const filteredCount = filteredStats[index].count
          const allPercentage = maxCount > 0 ? (allCount / maxCount) * 100 : 0
          const filteredPercentage = maxCount > 0 ? (filteredCount / maxCount) * 100 : 0

          return (
            <div key={category.name} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge className={category.color}></Badge>
                  <span className="text-xs font-medium">
                    {category.name} (M{category.range[0]}-{category.range[1]})
                  </span>
                </div>
                <span className="text-xs font-medium">
                  {filteredCount}/{allCount}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                {/* Background bar showing all earthquakes */}
                <div
                  className="h-full bg-muted-foreground/30 rounded-full"
                  style={{ width: `${allPercentage}%` }}
                ></div>
                {/* Foreground bar showing filtered earthquakes */}
                <div
                  className={`h-full ${category.color} rounded-full -mt-1.5`}
                  style={{ width: `${filteredPercentage}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
