"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowDownUp, Clock, Ruler, ArrowUp, RefreshCw, ArrowDown } from "lucide-react"

// Define available sort options
export type EarthquakeSortOption = "distance" | "time" | "magnitude" | "depth" | "updates"

export const SORT_OPTIONS = [
  {
    id: "distance",
    name: "Closest",
    icon: <Ruler className="h-4 w-4 mr-2" />,
    description: "Sort by distance (closest first)",
  },
  {
    id: "time",
    name: "Newest",
    icon: <Clock className="h-4 w-4 mr-2" />,
    description: "Sort by time (newest first)",
  },
  {
    id: "magnitude",
    name: "Largest",
    icon: <ArrowUp className="h-4 w-4 mr-2" />,
    description: "Sort by magnitude (largest first)",
  },
  {
    id: "depth",
    name: "Deepest",
    icon: <ArrowDown className="h-4 w-4 mr-2" />,
    description: "Sort by depth (deepest first)",
  },
  {
    id: "updates",
    name: "Most Updated",
    icon: <RefreshCw className="h-4 w-4 mr-2" />,
    description: "Sort by number of updates (most first)",
  },
]

interface EarthquakeSortMenuProps {
  selectedSort: EarthquakeSortOption
  onSortChange: (sortOption: EarthquakeSortOption) => void
  locationAvailable: boolean
}

export function EarthquakeSortMenu({ selectedSort, onSortChange, locationAvailable }: EarthquakeSortMenuProps) {
  // Find the currently selected sort option
  const currentSort = SORT_OPTIONS.find((option) => option.id === selectedSort) || SORT_OPTIONS[1]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-8">
          <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
          <span>Sort by:</span> {currentSort.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuRadioGroup
          value={selectedSort}
          onValueChange={(value) => onSortChange(value as EarthquakeSortOption)}
        >
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.id}
              value={option.id}
              className="cursor-pointer flex items-center"
              disabled={option.id === "distance" && !locationAvailable}
            >
              <div className="flex items-center">
                {option.icon}
                <span>{option.name}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
