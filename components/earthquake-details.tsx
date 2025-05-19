"use client"

import { formatDistanceToNow } from "date-fns"
import { X, ExternalLink, AlertCircle, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EarthquakeHistory } from "./earthquake-history"
import type { EarthquakeInfo } from "@/types/earthquake"

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

interface EarthquakeDetailsProps {
  earthquake: EarthquakeInfo
  onClose: () => void
  history: any[]
}

export function EarthquakeDetails({ earthquake, onClose, history = [] }: EarthquakeDetailsProps) {
  if (!earthquake) return null

  const { magnitude, place, time, source, depth, tsunami, status, _id, location, city, type } = earthquake

  // Format coordinates
  const [longitude, latitude] = location.coordinates

  // Determine magnitude color
  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude < 2) return "bg-green-500"
    if (magnitude < 4) return "bg-yellow-500"
    if (magnitude < 6) return "bg-orange-500"
    return "bg-red-500"
  }

  // Determine alert color if available
  const getAlertColor = (alertLevel: string | null) => {
    if (!alertLevel) return "bg-gray-500"
    switch (alertLevel) {
      case "green":
        return "bg-green-500"
      case "yellow":
        return "bg-yellow-500"
      case "orange":
        return "bg-orange-500"
      case "red":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm shadow-lg border-0">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Badge className={getMagnitudeColor(magnitude)}>
                M{magnitude.toFixed(1)} {type}
              </Badge>
              {place}
            </CardTitle>
            <CardDescription>
              {new Date(time * 1000).toLocaleString()} (
              {formatDistanceToNow(new Date(time * 1000), { addSuffix: true })})
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Location</h3>
                <p className="text-sm">{place}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Coordinates</h3>
                <p className="text-sm">
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Depth</h3>
                <p className="text-sm">{depth.toFixed(1)} km</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Source</h3>
                <p className="text-sm">{source}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Status</h3>
                <p className="text-sm">{getStatusLabel(status)}</p>
              </div>
            </div>

            {tsunami > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Tsunami Warning
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    This earthquake may generate a tsunami. Monitor local emergency channels for evacuation
                    instructions.
                  </p>
                  <Badge variant="destructive" className="mt-1">
                    TSUNAMI POTENTIAL
                  </Badge>
                </div>
              </>
            )}

            {city && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Nearest City</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">City</h3>
                      <p className="text-sm">{city.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-1">Country</h3>
                      <p className="text-sm">{city.country}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Distance</h3>
                    <p className="text-sm">{city.distance.toFixed(1)} km</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Event time: {new Date(time * 1000).toLocaleString()}</span>
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="history">
          <CardContent>
            <EarthquakeHistory earthquakeId={earthquake._id} history={history} />
          </CardContent>
        </TabsContent>
      </Tabs>

      <CardFooter>
        <Button variant="outline" className="w-full">
          <a
            href={`https://www.emsc-csem.org/Earthquake/earthquake.php?id=${_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            View More Details <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
