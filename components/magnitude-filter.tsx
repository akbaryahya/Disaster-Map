"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface MagnitudeFilterProps {
  onFilterChange: (range: [number, number]) => void
  totalEarthquakes: number
  filteredCount: number
}

export function MagnitudeFilter({ onFilterChange, totalEarthquakes, filteredCount }: MagnitudeFilterProps) {
  const [range, setRange] = useState<[number, number]>([0, 10])

  const handleRangeChange = (values: number[]) => {
    const newRange: [number, number] = [values[0], values[1]]
    setRange(newRange)
    onFilterChange(newRange)
  }

  const handleReset = () => {
    const defaultRange: [number, number] = [0, 10]
    setRange(defaultRange)
    onFilterChange(defaultRange)
  }

  // Function to determine color based on magnitude
  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude < 2) return "bg-green-500"
    if (magnitude < 4) return "bg-yellow-500"
    if (magnitude < 6) return "bg-orange-500"
    return "bg-red-500"
  }

  // Create magnitude badges for the range
  const minBadge = <Badge className={getMagnitudeColor(range[0])}>M{range[0].toFixed(1)}</Badge>
  const maxBadge = <Badge className={getMagnitudeColor(range[1])}>M{range[1].toFixed(1)}</Badge>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Magnitude Filter</h3>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm">Range:</span>
            {minBadge}
            <span>to</span>
            {maxBadge}
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredCount}/{totalEarthquakes}
          </div>
        </div>

        <Slider
          defaultValue={[0, 10]}
          value={range}
          min={0}
          max={10}
          step={0.1}
          onValueChange={handleRangeChange}
          className="w-full"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Minor</span>
          <span>Moderate</span>
          <span>Major</span>
        </div>
      </div>
    </div>
  )
}
