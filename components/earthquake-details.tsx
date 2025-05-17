"use client"

import { formatDistanceToNow } from "date-fns"
import { X, ExternalLink, AlertCircle, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EarthquakeHistory } from "./earthquake-history"

interface EarthquakeDetailsProps {
  earthquake: any
  onClose: () => void
  history: any[]
}

export function EarthquakeDetails({ earthquake, onClose, history = [] }: EarthquakeDetailsProps) {
  if (!earthquake) return null

  const { properties, geometry } = earthquake
  const {
    mag,
    place,
    time,
    updated,
    url,
    felt,
    cdi,
    mmi,
    alert,
    status,
    tsunami,
    sig,
    net,
    code,
    ids,
    sources,
    types,
    title,
    magType,
  } = properties

  // Format coordinates
  const [longitude, latitude, depth] = geometry.coordinates

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
              <Badge className={getMagnitudeColor(mag)}>M{mag.toFixed(1)}</Badge>
              {title}
            </CardTitle>
            <CardDescription>
              {new Date(time).toLocaleString()} ({formatDistanceToNow(new Date(time), { addSuffix: true })})
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
                <h3 className="text-sm font-medium mb-1">Magnitude Type</h3>
                <p className="text-sm">{magType}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Status</h3>
                <p className="text-sm capitalize">{status}</p>
              </div>
            </div>

            {(alert || tsunami > 0 || felt) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Alerts & Impact</h3>
                  <div className="flex flex-wrap gap-2">
                    {alert && (
                      <div className="flex items-center gap-1">
                        <Badge className={getAlertColor(alert)}>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Alert: {alert.toUpperCase()}
                        </Badge>
                      </div>
                    )}
                    {tsunami > 0 && <Badge variant="destructive">Tsunami Warning</Badge>}
                    {felt && felt > 0 && <Badge variant="outline">Felt by {felt} people</Badge>}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Significance</h3>
                <p className="text-sm">{sig || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Network</h3>
                <p className="text-sm">{net}</p>
              </div>
            </div>

            {(cdi || mmi) && (
              <div className="grid grid-cols-2 gap-4">
                {cdi && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Intensity (CDI)</h3>
                    <p className="text-sm">{cdi.toFixed(1)}</p>
                  </div>
                )}
                {mmi && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Intensity (MMI)</h3>
                    <p className="text-sm">{mmi.toFixed(1)}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Last updated: {new Date(updated).toLocaleString()}</span>
            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="history">
          <CardContent>
            <EarthquakeHistory earthquakeId={earthquake.id} history={history} />
          </CardContent>
        </TabsContent>
      </Tabs>

      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
            View on USGS <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
