"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ThemeToggle } from "@/components/theme-toggle"
import { MagnitudeFilter } from "@/components/magnitude-filter"
import { DepthFilter } from "@/components/depth-filter"
import { EarthquakeStatistics } from "@/components/earthquake-statistics"
import { DistanceSettings } from "@/components/distance-settings"
import { ChevronDown, ChevronUp, List, BellRing, BellOff, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MapLayerSelector } from "@/components/map-layer-selector"
import { EarthquakeDetails } from "@/components/earthquake-details"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateDistance, formatDistance } from "@/utils/distance"
import type { EarthquakeMapRef } from "@/components/earthquake-map"
import { EarthquakeSortMenu, type EarthquakeSortOption } from "@/components/earthquake-sort-menu"

// Import Leaflet map component dynamically to avoid SSR issues
const EarthquakeMap = dynamic(() => import("@/components/earthquake-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
      <Skeleton className="w-full h-full" />
    </div>
  ),
})

// Define the interface for earthquake changes
interface EarthquakeChange {
  property: string
  oldValue: any
  newValue: any
  timestamp: number
}

// Define the interface for earthquake history
interface EarthquakeHistory {
  [id: string]: EarthquakeChange[]
}

export default function Home() {
  const [earthquakes, setEarthquakes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [magnitudeRange, setMagnitudeRange] = useState<[number, number]>([0, 10])
  const [depthRange, setDepthRange] = useState<[number, number]>([0, 700])
  const [controlsVisible, setControlsVisible] = useState(true)
  const [listVisible, setListVisible] = useState(true)
  const [selectedMapLayer, setSelectedMapLayer] = useState("osm")
  const [selectedEarthquake, setSelectedEarthquake] = useState<any | null>(null)
  const [highlightedEarthquakeId, setHighlightedEarthquakeId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("filters")

  // Add state for alerts, history, and location
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [distanceThreshold, setDistanceThreshold] = useState<number>(1000)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [earthquakeHistory, setEarthquakeHistory] = useState<EarthquakeHistory>({})
  const [sortOption, setSortOption] = useState<EarthquakeSortOption>("time")

  // Create a ref to the map component
  const mapRef = useRef<EarthquakeMapRef>(null)

  // Create a ref to store the previous earthquakes for comparison
  const prevEarthquakesRef = useRef<{ [id: string]: any }>({})

  // Create a ref for the alert sound
  const alertSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initialize the alert sound
  useEffect(() => {
    if (typeof window !== "undefined") {
      alertSoundRef.current = new Audio("/alert.mp3")
    }

    return () => {
      if (alertSoundRef.current) {
        alertSoundRef.current = null
      }
    }
  }, [])

  const handleMagnitudeFilterChange = (range: [number, number]) => {
    setMagnitudeRange(range)
  }

  const handleDepthFilterChange = (range: [number, number]) => {
    setDepthRange(range)
  }

  const handleDistanceThresholdChange = (threshold: number) => {
    setDistanceThreshold(threshold)
  }

  const handleLocationChange = (location: { lat: number; lng: number } | null) => {
    setUserLocation(location)
  }

  // Filter earthquakes based on magnitude, depth, and optionally distance
  const filteredEarthquakes = earthquakes.filter((quake) => {
    const magnitude = quake.properties.mag
    const depth = quake.geometry.coordinates[2]

    // Apply magnitude and depth filters
    const passesBasicFilters =
      magnitude >= magnitudeRange[0] &&
      magnitude <= magnitudeRange[1] &&
      depth >= depthRange[0] &&
      depth <= depthRange[1]

    return passesBasicFilters
  })

  // Calculate distances for earthquakes if user location is available
  const earthquakesWithDistance = userLocation
    ? filteredEarthquakes.map((quake) => {
        const [longitude, latitude, depth] = quake.geometry.coordinates
        const distance = calculateDistance(userLocation.lat, userLocation.lng, latitude, longitude)
        return { ...quake, distance }
      })
    : filteredEarthquakes

  // Function to compare earthquakes and detect changes
  const compareEarthquakes = (newEarthquakes: any[], prevEarthquakes: { [id: string]: any }) => {
    const newEarthquakesMap: { [id: string]: any } = {}
    const updatedEarthquakes: string[] = []
    const newlyAddedEarthquakes: any[] = []
    const updatedHistory = { ...earthquakeHistory }

    // Process each earthquake in the new data
    newEarthquakes.forEach((quake) => {
      const id = quake.id
      newEarthquakesMap[id] = quake

      // Check if this earthquake existed before
      if (prevEarthquakes[id]) {
        const oldQuake = prevEarthquakes[id]
        const changes: EarthquakeChange[] = []

        // Check for property changes
        const propertiesToCheck = ["mag", "place", "status", "alert", "tsunami"]
        propertiesToCheck.forEach((prop) => {
          if (oldQuake.properties[prop] !== quake.properties[prop]) {
            changes.push({
              property: prop,
              oldValue: oldQuake.properties[prop],
              newValue: quake.properties[prop],
              timestamp: Date.now(),
            })
          }
        })

        // If there are changes, update history and mark as updated
        if (changes.length > 0) {
          updatedEarthquakes.push(id)

          // Initialize history array if it doesn't exist
          if (!updatedHistory[id]) {
            updatedHistory[id] = []
          }

          // Add new changes to history
          updatedHistory[id] = [...updatedHistory[id], ...changes]
        }
      } else {
        // This is a new earthquake
        newlyAddedEarthquakes.push(quake)
      }
    })

    // Update the history state
    setEarthquakeHistory(updatedHistory)

    return {
      newEarthquakesMap,
      updatedEarthquakes,
      newlyAddedEarthquakes,
    }
  }

  const fetchEarthquakeData = async () => {
    try {
      setLoading(true)
      // Using USGS Earthquake API - past day all earthquakes
      const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")

      if (!response.ok) {
        throw new Error("Failed to fetch earthquake data")
      }

      const data = await response.json()

      // Compare with previous earthquakes to detect changes
      const { newEarthquakesMap, updatedEarthquakes, newlyAddedEarthquakes } = compareEarthquakes(
        data.features,
        prevEarthquakesRef.current,
      )

      // Update the earthquakes state
      setEarthquakes(data.features)
      setLastUpdated(new Date())

      // Store the current earthquakes for future comparison
      prevEarthquakesRef.current = newEarthquakesMap

      // Handle new earthquakes if alerts are enabled
      if (alertsEnabled && newlyAddedEarthquakes.length > 0) {
        // Sort by magnitude (highest first) to alert about the most significant one
        const sortedNewEarthquakes = [...newlyAddedEarthquakes].sort((a, b) => b.properties.mag - a.properties.mag)

        const mostSignificantEarthquake = sortedNewEarthquakes[0]

        // Check if the earthquake is within the distance threshold (if location is available)
        let withinThreshold = true
        let distance = null

        if (userLocation) {
          const [longitude, latitude] = mostSignificantEarthquake.geometry.coordinates
          distance = calculateDistance(userLocation.lat, userLocation.lng, latitude, longitude)
          withinThreshold = distance <= distanceThreshold
        }

        // Only alert if within threshold or no location set
        if (withinThreshold) {
          // Play alert sound
          if (alertSoundRef.current) {
            alertSoundRef.current.play().catch((e) => console.error("Error playing alert sound:", e))
          }

          // Show toast notification
          toast({
            title: "New Earthquake Detected",
            description: `M${mostSignificantEarthquake.properties.mag.toFixed(1)} - ${
              mostSignificantEarthquake.properties.place
            }${distance ? ` (${formatDistance(distance)} away)` : ""}`,
            variant: "destructive",
          })

          // Navigate to the new earthquake
          if (mapRef.current) {
            mapRef.current.flyToEarthquake(mostSignificantEarthquake.id)
          }

          // Highlight the new earthquake
          setHighlightedEarthquakeId(mostSignificantEarthquake.id)
        }
      }

      // Handle updated earthquakes
      if (updatedEarthquakes.length > 0) {
        // Show toast for updated earthquakes
        toast({
          title: "Earthquake Data Updated",
          description: `${updatedEarthquakes.length} earthquake(s) have been updated with new information.`,
          variant: "default",
        })
      }

      setError(null)
    } catch (err) {
      setError("Error fetching earthquake data. Please try again later.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch data immediately on mount
    fetchEarthquakeData()

    // Set up interval to fetch data every minute
    const intervalId = setInterval(fetchEarthquakeData, 60000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  // Re-run fetch when distance threshold or user location changes
  useEffect(() => {
    // No need to re-fetch, just re-process the alerts logic
  }, [distanceThreshold, userLocation])

  // Function to determine badge color based on magnitude
  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude < 2) return "bg-green-500"
    if (magnitude < 4) return "bg-yellow-500"
    if (magnitude < 6) return "bg-orange-500"
    return "bg-red-500"
  }

  // Function to determine badge color based on depth
  const getDepthColor = (depth: number) => {
    if (depth < 10) return "bg-sky-400"
    if (depth < 50) return "bg-sky-500"
    if (depth < 200) return "bg-indigo-500"
    return "bg-violet-700"
  }

  // Handle earthquake selection from the map
  const handleEarthquakeSelect = (id: string) => {
    const earthquake = earthquakes.find((quake) => quake.id === id)
    setSelectedEarthquake(earthquake || null)
    setHighlightedEarthquakeId(id)
  }

  // Handle earthquake selection from the list
  const handleListItemClick = (quake: any) => {
    // Set the highlighted earthquake ID for visual feedback
    setHighlightedEarthquakeId(quake.id)

    // Fly to the earthquake location on the map
    if (mapRef.current) {
      mapRef.current.flyToEarthquake(quake.id)
    }
  }

  // Close the details panel
  const handleCloseDetails = () => {
    setSelectedEarthquake(null)
    // Keep the highlighted state when closing details
    // setHighlightedEarthquakeId(null)
  }

  // Toggle alerts
  const handleToggleAlerts = () => {
    setAlertsEnabled(!alertsEnabled)

    // Show toast to confirm the change
    toast({
      title: alertsEnabled ? "Alerts Disabled" : "Alerts Enabled",
      description: alertsEnabled
        ? "You will no longer receive alerts for new earthquakes."
        : "You will now receive alerts for new earthquakes.",
      variant: "default",
    })
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map container - takes full screen */}
      <div className="absolute inset-0 z-0">
        {loading && earthquakes.length === 0 ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <EarthquakeMap
            ref={mapRef}
            earthquakes={earthquakesWithDistance}
            mapLayerId={selectedMapLayer}
            onEarthquakeSelect={handleEarthquakeSelect}
            highlightedEarthquakeId={highlightedEarthquakeId}
            userLocation={userLocation}
          />
        )}
      </div>

      {/* Header with title and theme toggle */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm p-4 flex justify-between items-center shadow-md">
        <h1 className="text-2xl font-bold">Earthquake Monitor</h1>
        <div className="flex items-center gap-2">
          {/* Add alert toggle */}
          <div className="flex items-center gap-2 mr-2">
            <Switch id="alerts" checked={alertsEnabled} onCheckedChange={handleToggleAlerts} />
            <Label htmlFor="alerts" className="flex items-center gap-1">
              {alertsEnabled ? <BellRing className="h-4 w-4 text-yellow-500" /> : <BellOff className="h-4 w-4" />}
              <span className="sr-only md:not-sr-only md:inline-block">Alerts</span>
            </Label>
          </div>

          {/* Map layer selector */}
          <MapLayerSelector selectedLayer={selectedMapLayer} onLayerChange={setSelectedMapLayer} />

          <Button
            variant="outline"
            size="icon"
            onClick={() => setControlsVisible(!controlsVisible)}
            aria-label={controlsVisible ? "Hide controls" : "Show controls"}
          >
            {controlsVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setListVisible(!listVisible)}
            aria-label={listVisible ? "Hide earthquake list" : "Show earthquake list"}
          >
            <List className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Controls panel - right side */}
      {controlsVisible && (
        <div className="absolute top-20 right-4 z-20 w-80 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <Card className="bg-background/80 backdrop-blur-sm shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Controls</CardTitle>
              <CardDescription>
                {lastUpdated && <span className="text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="filters">Filters</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="filters" className="space-y-6 pt-4">
                  <MagnitudeFilter
                    onFilterChange={handleMagnitudeFilterChange}
                    totalEarthquakes={earthquakes.length}
                    filteredCount={filteredEarthquakes.length}
                  />

                  <DepthFilter
                    onFilterChange={handleDepthFilterChange}
                    totalEarthquakes={earthquakes.length}
                    filteredCount={filteredEarthquakes.length}
                  />

                  <div className="pt-4">
                    <EarthquakeStatistics earthquakes={earthquakes} filteredEarthquakes={filteredEarthquakes} />
                  </div>
                </TabsContent>
                <TabsContent value="settings" className="pt-4">
                  <DistanceSettings
                    onDistanceThresholdChange={handleDistanceThresholdChange}
                    onLocationChange={handleLocationChange}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Earthquake list panel - bottom */}
      {listVisible && (
        <div className="absolute bottom-4 left-4 right-4 z-20 max-h-[40vh]">
          <Card className="bg-background/80 backdrop-blur-sm shadow-lg border-0">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Earthquakes</CardTitle>
                  <CardDescription>
                    Showing {filteredEarthquakes.length} of {earthquakes.length} earthquakes
                  </CardDescription>
                </div>
                <EarthquakeSortMenu
                  selectedSort={sortOption}
                  onSortChange={setSortOption}
                  locationAvailable={!!userLocation}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading && earthquakes.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-4 text-red-500">{error}</div>
              ) : (
                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2">
                  {earthquakesWithDistance
                    .sort((a, b) => {
                      switch (sortOption) {
                        case "distance":
                          // If distance is available, sort by distance (closest first)
                          if (a.distance !== undefined && b.distance !== undefined) {
                            return a.distance - b.distance
                          }
                          // Fall back to time if distances aren't available
                          return b.properties.time - a.properties.time

                        case "magnitude":
                          // Sort by magnitude (largest first)
                          return b.properties.mag - a.properties.mag

                        case "depth":
                          // Sort by depth (deepest first)
                          return b.geometry.coordinates[2] - a.geometry.coordinates[2]

                        case "updates":
                          // Sort by number of updates (most first)
                          const aUpdates = earthquakeHistory[a.id]?.length || 0
                          const bUpdates = earthquakeHistory[b.id]?.length || 0
                          return bUpdates - aUpdates

                        case "time":
                        default:
                          // Sort by time (most recent first)
                          return b.properties.time - a.properties.time
                      }
                    })
                    .map((quake) => {
                      // Check if this earthquake has history (has been updated)
                      const hasUpdates = earthquakeHistory[quake.id] && earthquakeHistory[quake.id].length > 0

                      return (
                        <div
                          key={quake.id}
                          className={`border rounded-lg p-4 hover:bg-background/90 transition-colors cursor-pointer ${
                            highlightedEarthquakeId === quake.id ? "ring-2 ring-primary" : ""
                          }`}
                          onClick={() => handleListItemClick(quake)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium flex items-center gap-1">
                                {quake.properties.place || "Unknown Location"}
                                {hasUpdates && (
                                  <Badge variant="outline" className="text-xs ml-1">
                                    Updated
                                  </Badge>
                                )}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(quake.properties.time).toLocaleString()} (
                                {formatDistanceToNow(new Date(quake.properties.time), { addSuffix: true })})
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge className={getMagnitudeColor(quake.properties.mag)}>
                                M{quake.properties.mag.toFixed(1)}
                              </Badge>
                              <Badge variant="outline" className={getDepthColor(quake.geometry.coordinates[2])}>
                                {quake.geometry.coordinates[2].toFixed(1)} km
                              </Badge>
                              {sortOption === "updates" && earthquakeHistory[quake.id]?.length > 0 && (
                                <Badge variant="secondary">{earthquakeHistory[quake.id].length} updates</Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-sm flex justify-between">
                            {sortOption === "depth" ? (
                              <span className="text-muted-foreground">
                                <strong>Depth:</strong> {quake.geometry.coordinates[2].toFixed(1)} km
                              </span>
                            ) : sortOption === "time" ? (
                              <span className="text-muted-foreground">
                                <strong>Time:</strong>{" "}
                                {formatDistanceToNow(new Date(quake.properties.time), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                <strong>Location:</strong> {quake.properties.place.split(",")[0]}
                              </span>
                            )}
                            {quake.distance !== undefined && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {formatDistance(quake.distance)} away
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Earthquake details panel - center */}
      {selectedEarthquake && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <EarthquakeDetails
            earthquake={selectedEarthquake}
            onClose={handleCloseDetails}
            history={earthquakeHistory[selectedEarthquake.id] || []}
          />
        </div>
      )}

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}
