"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface DepthFilterProps {
  onFilterChange: (range: [number, number]) => void
  totalEarthquakes: number
  filteredCount: number
}

export function DepthFilter({ onFilterChange, totalEarthquakes, filteredCount }: DepthFilterProps) {
  const [range, setRange] = useState<[number, number]>([0, 700])

  const handleRangeChange = (values: number[]) => {
    const newRange: [number, number] = [values[0], values[1]]
    setRange(newRange)
    onFilterChange(newRange)
  }

  const handleReset = () => {
    const defaultRange: [number, number] = [0, 700]
    setRange(defaultRange)
    onFilterChange(defaultRange)
  }

  // Function to determine color based on depth
  const getDepthColor = (depth: number) => {
    if (depth < 10) return "bg-sky-400"
    if (depth < 50) return "bg-sky-500"
    if (depth < 200) return "bg-indigo-500"
    return "bg-violet-700"
  }

  // Create depth badges for the range
  const minBadge = <Badge className={getDepthColor(range[0])}>{range[0]} km</Badge>
  const maxBadge = <Badge className={getDepthColor(range[1])}>{range[1]} km</Badge>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Depth Filter</h3>
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
          defaultValue={[0, 700]}
          value={range}
          min={0}
          max={700}
          step={5}
          onValueChange={handleRangeChange}
          className="w-full"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Shallow</span>
          <span>Intermediate</span>
          <span>Deep</span>
        </div>
      </div>
    </div>
  )
}
