"use client"

import { formatDistanceToNow } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowUp, ArrowDown, ArrowRight, RefreshCw } from "lucide-react"

interface EarthquakeChange {
  property: string
  oldValue: any
  newValue: any
  timestamp: number
}

interface EarthquakeHistoryProps {
  earthquakeId: string
  history: EarthquakeChange[]
}

export function EarthquakeHistory({ earthquakeId, history }: EarthquakeHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">No history available for this earthquake.</div>
    )
  }

  // Function to format the change for display
  const formatChange = (change: EarthquakeChange) => {
    const { property, oldValue, newValue } = change

    // Format based on property type
    switch (property) {
      case "mag":
        const diff = newValue - oldValue
        const icon =
          diff > 0 ? (
            <ArrowUp className="h-3 w-3 text-red-500" />
          ) : diff < 0 ? (
            <ArrowDown className="h-3 w-3 text-green-500" />
          ) : (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          )

        return (
          <div className="flex items-center gap-1">
            <span>Magnitude updated from</span>
            <Badge variant="outline">{oldValue.toFixed(1)}</Badge>
            <span>to</span>
            <Badge variant={diff > 0 ? "destructive" : diff < 0 ? "default" : "outline"}>{newValue.toFixed(1)}</Badge>
            {icon}
          </div>
        )

      case "place":
        return (
          <div className="flex flex-col gap-1">
            <span>Location updated:</span>
            <Badge variant="outline" className="text-xs">
              {oldValue}
            </Badge>
            <span>to</span>
            <Badge variant="outline" className="text-xs">
              {newValue}
            </Badge>
          </div>
        )

      case "status":
        return (
          <div className="flex items-center gap-1">
            <span>Status changed from</span>
            <Badge variant="outline">{oldValue}</Badge>
            <span>to</span>
            <Badge variant="outline">{newValue}</Badge>
          </div>
        )

      default:
        return (
          <div className="flex items-center gap-1">
            <span>{property} updated from</span>
            <Badge variant="outline">{String(oldValue)}</Badge>
            <span>to</span>
            <Badge variant="outline">{String(newValue)}</Badge>
          </div>
        )
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <RefreshCw className="h-4 w-4" />
        <span>Update History</span>
      </div>
      <ScrollArea className="h-[150px] rounded-md border p-2">
        <div className="space-y-3">
          {history
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((change, index) => (
              <div key={index} className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(change.timestamp), { addSuffix: true })} (
                  {new Date(change.timestamp).toLocaleString()})
                </div>
                <div className="text-sm">{formatChange(change)}</div>
                {index < history.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  )
}
