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
import { ChevronDown, ChevronUp, List, BellRing, BellOff, MapPin, Volume2, VolumeX, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MapLayerSelector } from "@/components/map-layer-selector"
import { EarthquakeDetails } from "@/components/earthquake-details"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateDistance, formatDistance } from "@/utils/distance"
import { loadEarthquakeHistory, addToEarthquakeHistory, cleanupOldHistory } from "@/utils/history-storage"
import type { EarthquakeMapRef } from "@/components/earthquake-map"
import { EarthquakeSortMenu, type EarthquakeSortOption } from "@/components/earthquake-sort-menu"
import type { EarthquakeChange, EarthquakeHistory, NewEarthquake } from "@/types/earthquake"

// Import Leaflet map component dynamically to avoid SSR issues
const EarthquakeMap = dynamic(() => import("@/components/earthquake-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
      <Skeleton className="w-full h-full" />
    </div>
  ),
})

// Duration for blinking effect in milliseconds
const BLINK_DURATION = 10000 // 10 seconds

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
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [distanceThreshold, setDistanceThreshold] = useState<number>(1000)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [earthquakeHistory, setEarthquakeHistory] = useState<EarthquakeHistory>({})
  const [sortOption, setSortOption] = useState<EarthquakeSortOption>("time")
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // Add state for tracking newly detected earthquakes
  const [newEarthquakes, setNewEarthquakes] = useState<NewEarthquake[]>([])

  // Add state for auto-pan feature
  const [autoPanEnabled, setAutoPanEnabled] = useState<boolean>(true)

  // Ref for the earthquake list container to scroll to new earthquakes
  const earthquakeListRef = useRef<HTMLDivElement>(null)

  // Create a ref for the audio context
  const audioContextRef = useRef<AudioContext | null>(null)

  // Create a ref to the map component
  const mapRef = useRef<EarthquakeMapRef>(null)

  // Create a ref to store the previous earthquakes for comparison
  const prevEarthquakesRef = useRef<{ [id: string]: any }>({})

  // Load earthquake history from localStorage on component mount
  useEffect(() => {
    const loadedHistory = loadEarthquakeHistory()
    setEarthquakeHistory(loadedHistory)
    setHistoryLoaded(true)

    // Load auto-pan setting from localStorage
    const savedAutoPan = localStorage.getItem("earthquakeAutoPan")
    if (savedAutoPan !== null) {
      setAutoPanEnabled(savedAutoPan === "true")
    }

    // Load alerts setting from localStorage
    const savedAlerts = localStorage.getItem("earthquakeAlertsEnabled")
    if (savedAlerts !== null) {
      setAlertsEnabled(savedAlerts === "true")
    }

    // Load sound setting from localStorage
    const savedSound = localStorage.getItem("earthquakeSoundEnabled")
    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true")
    }

    // Schedule periodic cleanup of old history entries
    const cleanupInterval = setInterval(
      () => {
        setEarthquakeHistory((prevHistory) => cleanupOldHistory(prevHistory))
      },
      24 * 60 * 60 * 1000,
    ) // Run once a day

    return () => {
      clearInterval(cleanupInterval)
    }
  }, [])

  // Effect to remove earthquakes from the "new" list after the blink duration
  useEffect(() => {
    if (newEarthquakes.length === 0) return

    const now = Date.now()
    const timeouts: NodeJS.Timeout[] = []

    newEarthquakes.forEach((quake) => {
      const timeRemaining = Math.max(0, quake.detectedAt + BLINK_DURATION - now)

      if (timeRemaining > 0) {
        const timeout = setTimeout(() => {
          setNewEarthquakes((prev) => prev.filter((eq) => eq.id !== quake.id))
        }, timeRemaining)

        timeouts.push(timeout)
      } else {
        // If the earthquake has already been blinking for longer than the duration,
        // remove it from the list immediately
        setNewEarthquakes((prev) => prev.filter((eq) => eq.id !== quake.id))
      }
    })

    // Clean up timeouts on unmount or when newEarthquakes changes
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout))
    }
  }, [newEarthquakes])

  // Function to play a beep sound using Web Audio API
  const playAlertSound = () => {
    if (!soundEnabled) return

    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const context = audioContextRef.current

      // Create oscillator
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      // Set properties for a pleasant alert sound
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(880, context.currentTime) // A5 note

      // Fade in and out to avoid clicks
      gainNode.gain.setValueAtTime(0, context.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1)
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.5)

      // Start and stop
      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + 0.5)

      // Create a second tone for a more attention-grabbing alert
      setTimeout(() => {
        if (!audioContextRef.current) return

        const oscillator2 = audioContextRef.current.createOscillator()
        const gainNode2 = audioContextRef.current.createGain()

        oscillator2.connect(gainNode2)
        gainNode2.connect(audioContextRef.current.destination)

        oscillator2.type = "sine"
        oscillator2.frequency.setValueAtTime(1046.5, audioContextRef.current.currentTime) // C6 note

        gainNode2.gain.setValueAtTime(0, audioContextRef.current.currentTime)
        gainNode2.gain.linearRampToValueAtTime(0.5, audioContextRef.current.currentTime + 0.1)
        gainNode2.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.5)

        oscillator2.start(audioContextRef.current.currentTime)
        oscillator2.stop(audioContextRef.current.currentTime + 0.5)
      }, 300)
    } catch (err) {
      console.error("Error playing alert sound:", err)
    }
  }

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch((err) => {
          console.error("Error closing AudioContext:", err)
        })
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
    // Prevent unnecessary re-renders if the location hasn't actually changed
    if (
      location === userLocation ||
      (location && userLocation && location.lat === userLocation.lat && location.lng === userLocation.lng)
    ) {
      return
    }

    setUserLocation(location)
  }

  // Toggle auto-pan feature
  const handleToggleAutoPan = () => {
    const newValue = !autoPanEnabled
    setAutoPanEnabled(newValue)
    localStorage.setItem("earthquakeAutoPan", newValue.toString())

    toast({
      title: newValue ? "Auto-Pan Enabled" : "Auto-Pan Disabled",
      description: newValue
        ? "Map will automatically move to new earthquakes."
        : "Map will stay in place when new earthquakes occur.",
      variant: "default",
    })
  }

  // Toggle alerts
  const handleToggleAlerts = () => {
    const newValue = !alertsEnabled
    setAlertsEnabled(newValue)
    localStorage.setItem("earthquakeAlertsEnabled", newValue.toString())

    // Show toast to confirm the change
    toast({
      title: newValue ? "Alerts Enabled" : "Alerts Disabled",
      description: newValue
        ? "You will now receive alerts for new earthquakes."
        : "You will no longer receive alerts for new earthquakes.",
      variant: "default",
    })
  }

  // Toggle sound
  const handleToggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem("earthquakeSoundEnabled", newValue.toString())

    // Initialize audio context if turning on sound
    if (newValue && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (err) {
        console.error("Error initializing AudioContext:", err)
      }
    }

    // Show toast to confirm the change
    toast({
      title: newValue ? "Alert Sound Enabled" : "Alert Sound Disabled",
      description: newValue ? "Alert sounds have been turned on." : "Alert sounds have been turned off.",
      variant: "default",
    })
  }

  // Function to navigate to an earthquake on the map
  const navigateToEarthquake = (earthquake: any) => {
    if (!mapRef.current) {
      console.error("Map reference not available")
      return
    }

    try {
      // First try using the flyToEarthquake method which uses the marker
      mapRef.current.flyToEarthquake(earthquake.id)

      // As a fallback, also try using the direct coordinates
      // This will work even if the marker isn't ready yet
      setTimeout(() => {
        if (mapRef.current) {
          const [longitude, latitude] = earthquake.geometry.coordinates
          mapRef.current.flyToCoordinates(latitude, longitude, 10)
        }
      }, 300)
    } catch (error) {
      console.error("Error navigating to earthquake:", error)

      // Last resort fallback - use direct coordinates
      if (mapRef.current) {
        const [longitude, latitude] = earthquake.geometry.coordinates
        mapRef.current.flyToCoordinates(latitude, longitude, 10)
      }
    }
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
    let updatedHistory = { ...earthquakeHistory }

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

          // Use our utility to add changes to history and persist to localStorage
          updatedHistory = addToEarthquakeHistory(updatedHistory, id, changes)
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

  // Function to scroll to an earthquake in the list
  const scrollToEarthquake = (earthquakeId: string) => {
    if (!earthquakeListRef.current) return

    // Find the earthquake element
    const earthquakeElement = earthquakeListRef.current.querySelector(`[data-earthquake-id="${earthquakeId}"]`)

    if (earthquakeElement) {
      // Scroll the element into view with smooth behavior
      earthquakeElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
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

      // Only compare earthquakes if history has been loaded
      if (historyLoaded) {
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
            playAlertSound()

            // Add the earthquake to the new earthquakes list for blinking
            setNewEarthquakes((prev) => [...prev, { id: mostSignificantEarthquake.id, detectedAt: Date.now() }])

            // Show toast notification with action button to view on map
            toast({
              title: "New Earthquake Detected",
              description: `M${mostSignificantEarthquake.properties.mag.toFixed(1)} - ${
                mostSignificantEarthquake.properties.place
              }${distance ? ` (${formatDistance(distance)} away)` : ""}`,
              variant: "destructive",
              action: (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigateToEarthquake(mostSignificantEarthquake)
                  }}
                  className="bg-background text-foreground hover:bg-background/90"
                >
                  <Map className="h-4 w-4 mr-1" />
                  View on Map
                </Button>
              ),
            })

            // Highlight the new earthquake
            setHighlightedEarthquakeId(mostSignificantEarthquake.id)

            // Make sure the list is visible
            setListVisible(true)

            // Wait a moment for the list to render, then scroll to the earthquake
            setTimeout(() => {
              scrollToEarthquake(mostSignificantEarthquake.id)
            }, 300)

            // If auto-pan is enabled, automatically move the map to the new earthquake
            if (autoPanEnabled) {
              // Wait a short moment to ensure the map and markers are ready
              setTimeout(() => {
                navigateToEarthquake(mostSignificantEarthquake)
              }, 500)
            }
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
      } else {
        // If history hasn't been loaded yet, just set the earthquakes without comparison
        setEarthquakes(data.features)
        setLastUpdated(new Date())

        // Initialize the previous earthquakes map
        const initialEarthquakesMap: { [id: string]: any } = {}
        data.features.forEach((quake: any) => {
          initialEarthquakesMap[quake.id] = quake
        })
        prevEarthquakesRef.current = initialEarthquakesMap
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

    // Set up interval to fetch data every 5 sec
    const intervalId = setInterval(fetchEarthquakeData, 1000 * 5)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [historyLoaded]) // Re-run when historyLoaded changes

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
    navigateToEarthquake(quake)
  }

  // Close the details panel
  const handleCloseDetails = () => {
    setSelectedEarthquake(null)
    // Keep the highlighted state when closing details
    // setHighlightedEarthquakeId(null)
  }

  // Test sound button handler
  const handleTestSound = () => {
    playAlertSound()
    toast({
      title: "Testing Alert Sound",
      description: "If you didn't hear anything, check your device volume or browser permissions.",
      variant: "default",
    })
  }

  // Get the total number of history entries
  const totalHistoryEntries = Object.values(earthquakeHistory).reduce((total, changes) => total + changes.length, 0)

  // Check if an earthquake is new (for blinking effect)
  const isNewEarthquake = (earthquakeId: string) => {
    return newEarthquakes.some((eq) => eq.id === earthquakeId)
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
                {totalHistoryEntries > 0 && (
                  <span className="text-xs block mt-1">
                    History: {totalHistoryEntries} updates for {Object.keys(earthquakeHistory).length} earthquakes
                  </span>
                )}
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
                  <div className="space-y-6">
                    <DistanceSettings
                      onDistanceThresholdChange={handleDistanceThresholdChange}
                      onLocationChange={handleLocationChange}
                    />

                    {/* Notification settings */}
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-3">Notification Settings</h3>

                      {/* Alerts toggle */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {alertsEnabled ? (
                            <BellRing className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <BellOff className="h-4 w-4" />
                          )}
                          <Label htmlFor="alerts-setting" className="text-sm">
                            Earthquake alerts
                          </Label>
                        </div>
                        <Switch id="alerts-setting" checked={alertsEnabled} onCheckedChange={handleToggleAlerts} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        {alertsEnabled
                          ? "You will receive notifications for new earthquakes"
                          : "You will not receive notifications for new earthquakes"}
                      </p>

                      {/* Sound toggle */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {soundEnabled ? (
                            <Volume2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <VolumeX className="h-4 w-4" />
                          )}
                          <Label htmlFor="sound-setting" className="text-sm">
                            Alert sounds
                          </Label>
                        </div>
                        <Switch id="sound-setting" checked={soundEnabled} onCheckedChange={handleToggleSound} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {soundEnabled ? "Sound will play when new earthquakes are detected" : "Alerts will be silent"}
                      </p>

                      {/* Test sound button */}
                      {soundEnabled && (
                        <Button variant="outline" size="sm" onClick={handleTestSound} className="w-full mt-2">
                          <Volume2 className="h-4 w-4 mr-2" />
                          Test Alert Sound
                        </Button>
                      )}
                    </div>

                    {/* Map settings */}
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-3">Map Settings</h3>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {autoPanEnabled ? <Map className="h-4 w-4 text-blue-500" /> : <Map className="h-4 w-4" />}
                          <Label htmlFor="auto-pan-setting" className="text-sm">
                            Auto-pan to new earthquakes
                          </Label>
                        </div>
                        <Switch id="auto-pan-setting" checked={autoPanEnabled} onCheckedChange={handleToggleAutoPan} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {autoPanEnabled
                          ? "Map will automatically move to show new earthquakes"
                          : "Map will stay in place when new earthquakes occur"}
                      </p>
                    </div>
                  </div>
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
                    {newEarthquakes.length > 0 && (
                      <span className="ml-2 text-destructive font-medium">({newEarthquakes.length} new)</span>
                    )}
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
                <div ref={earthquakeListRef} className="space-y-4 max-h-[30vh] overflow-y-auto pr-2">
                  {earthquakesWithDistance
                    .sort((a, b) => {
                      // Always show new earthquakes at the top if sorting by time
                      if (sortOption === "time") {
                        const aIsNew = isNewEarthquake(a.id)
                        const bIsNew = isNewEarthquake(b.id)

                        if (aIsNew && !bIsNew) return -1
                        if (!aIsNew && bIsNew) return 1
                      }

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

                      // Check if this is a new earthquake (for blinking effect)
                      const isNew = isNewEarthquake(quake.id)

                      return (
                        <div
                          key={quake.id}
                          data-earthquake-id={quake.id}
                          className={`border rounded-lg p-4 hover:bg-background/90 transition-colors cursor-pointer ${
                            highlightedEarthquakeId === quake.id ? "ring-2 ring-primary" : ""
                          } ${isNew ? "earthquake-blink" : ""}`}
                          onClick={() => handleListItemClick(quake)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium flex items-center gap-1">
                                {quake.properties.place || "Unknown Location"}
                                {isNew && (
                                  <Badge variant="destructive" className="text-xs ml-1">
                                    NEW
                                  </Badge>
                                )}
                                {hasUpdates && !isNew && (
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
