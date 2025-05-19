import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface EarthquakeChange {
  property: string
  oldValue: string | number
  newValue: string | number
}

// Add this helper function at the top of the file, outside the component
const getStatusLabel = (status: number): string => {
  switch (status) {
    case 1:
      return "Automatic"
    case 2:
      return "Manual"
    case 3:
      return "Confirmed"
    default:
      return "Unknown"
  }
}

// Function to format the change for display
const formatChange = (change: EarthquakeChange) => {
  const { property, oldValue, newValue } = change

  // Format based on property type
  switch (property) {
    case "magnitude":
      const diff = Number(newValue) - Number(oldValue)
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
          <Badge variant="outline">{Number(oldValue).toFixed(1)}</Badge>
          <span>to</span>
          <Badge variant={diff > 0 ? "destructive" : diff < 0 ? "default" : "outline"}>
            {Number(newValue).toFixed(1)}
          </Badge>
          {icon}
        </div>
      )

    case "place":
      return (
        <div className="flex flex-col gap-1">
          <span>Location updated:</span>
          <Badge variant="outline" className="text-xs">
            {String(oldValue)}
          </Badge>
          <span>to</span>
          <Badge variant="outline" className="text-xs">
            {String(newValue)}
          </Badge>
        </div>
      )

    case "status":
      return (
        <div className="flex items-center gap-1">
          <span>Status changed from</span>
          <Badge variant="outline">{getStatusLabel(Number(oldValue))}</Badge>
          <span>to</span>
          <Badge variant="outline">{getStatusLabel(Number(newValue))}</Badge>
        </div>
      )

    case "type":
      return (
        <div className="flex items-center gap-1">
          <span>Magnitude type changed from</span>
          <Badge variant="outline">{String(oldValue)}</Badge>
          <span>to</span>
          <Badge variant="outline">{String(newValue)}</Badge>
        </div>
      )

    case "tsunami":
      return (
        <div className="flex items-center gap-1">
          <span>Tsunami warning</span>
          {Number(newValue) === 1 ? (
            <Badge variant="destructive">Activated</Badge>
          ) : (
            <Badge variant="outline">Deactivated</Badge>
          )}
        </div>
      )

    case "depth":
      const depthDiff = Number(newValue) - Number(oldValue)
      const depthIcon =
        depthDiff > 0 ? (
          <ArrowDown className="h-3 w-3 text-red-500" />
        ) : depthDiff < 0 ? (
          <ArrowUp className="h-3 w-3 text-green-500" />
        ) : (
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        )

      return (
        <div className="flex items-center gap-1">
          <span>Depth updated from</span>
          <Badge variant="outline">{Number(oldValue).toFixed(1)} km</Badge>
          <span>to</span>
          <Badge variant="outline">{Number(newValue).toFixed(1)} km</Badge>
          {depthIcon}
        </div>
      )

    case "source":
      return (
        <div className="flex items-center gap-1">
          <span>Source changed from</span>
          <Badge variant="outline">{String(oldValue)}</Badge>
          <span>to</span>
          <Badge variant="outline">{String(newValue)}</Badge>
        </div>
      )

    case "location":
      return (
        <div className="flex flex-col gap-1">
          <span>Coordinates updated:</span>
          <Badge variant="outline" className="text-xs">
            {String(oldValue)}
          </Badge>
          <span>to</span>
          <Badge variant="outline" className="text-xs">
            {String(newValue)}
          </Badge>
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

interface EarthquakeHistoryProps {
  earthquakeId: string
  history: EarthquakeChange[]
}

export function EarthquakeHistory({ earthquakeId, history }: EarthquakeHistoryProps) {
  if (!history || history.length === 0) {
    return <div className="text-sm text-muted-foreground">No history available for this earthquake.</div>
  }

  return (
    <div className="space-y-2">
      {history.map((change, index) => (
        <div key={`${earthquakeId}-${index}`} className="text-sm">
          {formatChange(change)}
        </div>
      ))}
    </div>
  )
}
