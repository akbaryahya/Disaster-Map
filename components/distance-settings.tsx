"use client"

import { useState, useEffect, useRef } from "react"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

interface DistanceSettingsProps {
  onDistanceThresholdChange: (threshold: number) => void
  onLocationChange: (location: { lat: number; lng: number } | null) => void
}

export function DistanceSettings({ onDistanceThresholdChange, onLocationChange }: DistanceSettingsProps) {
  const [distanceThreshold, setDistanceThreshold] = useState<number>(1000)
  const [useCurrentLocation, setUseCurrentLocation] = useState<boolean>(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [customLat, setCustomLat] = useState<string>("")
  const [customLng, setCustomLng] = useState<string>("")
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  // Ref to store the geolocation watcher ID
  const watchIdRef = useRef<number | null>(null)

  // Ref to track if this is the initial location set
  const isInitialLocationRef = useRef<boolean>(true)

  // Ref to track if location was manually set
  const isManualLocationUpdateRef = useRef<boolean>(false)

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const savedThreshold = localStorage.getItem("earthquakeDistanceThreshold")
    const savedUseCurrentLocation = localStorage.getItem("earthquakeUseCurrentLocation")
    const savedCustomLat = localStorage.getItem("earthquakeCustomLat")
    const savedCustomLng = localStorage.getItem("earthquakeCustomLng")

    if (savedThreshold) {
      const threshold = Number.parseInt(savedThreshold, 10)
      setDistanceThreshold(threshold)
      onDistanceThresholdChange(threshold)
    }

    if (savedUseCurrentLocation === "true") {
      setUseCurrentLocation(true)
      startLocationWatcher()
    } else if (savedCustomLat && savedCustomLng) {
      setCustomLat(savedCustomLat)
      setCustomLng(savedCustomLng)
      const lat = Number.parseFloat(savedCustomLat)
      const lng = Number.parseFloat(savedCustomLng)
      if (!isNaN(lat) && !isNaN(lng)) {
        const location = { lat, lng }
        setCurrentLocation(location)
        onLocationChange(location)
      }
    }

    // After initial load, future updates are not initial anymore
    isInitialLocationRef.current = false

    // Clean up location watcher on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [onDistanceThresholdChange, onLocationChange])

  // Start watching the user's location
  const startLocationWatcher = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Error",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      })
      setLocationStatus("error")
      return
    }

    setLocationStatus("loading")

    // Clear any existing watcher
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    // Start a new watcher
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setCurrentLocation(location)
        onLocationChange(location)
        setLocationStatus("success")

        // Save to localStorage
        localStorage.setItem("earthquakeUseCurrentLocation", "true")

        // Only show toast on initial location acquisition or manual updates
        if (isInitialLocationRef.current || isManualLocationUpdateRef.current) {
          toast({
            title: "Location Updated",
            description: `Your location has been set to ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
            variant: "default",
          })

          // Reset the manual update flag
          isManualLocationUpdateRef.current = false
        }

        // After first successful location, it's no longer initial
        isInitialLocationRef.current = false
      },
      (error) => {
        console.error("Error getting location:", error)
        setLocationStatus("error")
        setUseCurrentLocation(false)
        localStorage.setItem("earthquakeUseCurrentLocation", "false")

        toast({
          title: "Geolocation Error",
          description: `Unable to get your location: ${error.message}`,
          variant: "destructive",
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000, // 30 seconds
        timeout: 27000, // 27 seconds
      },
    )
  }

  // Handle custom location input
  const handleCustomLocationSubmit = () => {
    const lat = Number.parseFloat(customLat)
    const lng = Number.parseFloat(customLng)

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Invalid Coordinates",
        description: "Please enter valid latitude (-90 to 90) and longitude (-180 to 180) values.",
        variant: "destructive",
      })
      return
    }

    // Set manual update flag to true
    isManualLocationUpdateRef.current = true

    const location = { lat, lng }
    setCurrentLocation(location)
    onLocationChange(location)
    setLocationStatus("success")

    // Save to localStorage
    localStorage.setItem("earthquakeUseCurrentLocation", "false")
    localStorage.setItem("earthquakeCustomLat", lat.toString())
    localStorage.setItem("earthquakeCustomLng", lng.toString())

    toast({
      title: "Location Updated",
      description: `Custom location has been set to ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      variant: "default",
    })
  }

  // Handle distance threshold change
  const handleDistanceChange = (values: number[]) => {
    const threshold = values[0]
    setDistanceThreshold(threshold)
    onDistanceThresholdChange(threshold)
    localStorage.setItem("earthquakeDistanceThreshold", threshold.toString())
  }

  // Handle toggle for using current location
  const handleToggleCurrentLocation = (checked: boolean) => {
    setUseCurrentLocation(checked)

    // Set manual update flag to true since this is a user action
    isManualLocationUpdateRef.current = true

    if (checked) {
      startLocationWatcher()
    } else {
      // If turning off current location, clear the watcher
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      localStorage.setItem("earthquakeUseCurrentLocation", "false")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Distance-Based Alerts</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">Alert for earthquakes within:</span>
          <Badge variant="outline">{distanceThreshold} km</Badge>
        </div>
        <Slider
          value={[distanceThreshold]}
          min={50}
          max={5000}
          step={50}
          onValueChange={handleDistanceChange}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Nearby</span>
          <span>Regional</span>
          <span>Global</span>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Your Location
        </h3>

        <div className="flex items-center space-x-2">
          <Switch
            id="use-current-location"
            checked={useCurrentLocation}
            onCheckedChange={handleToggleCurrentLocation}
          />
          <Label htmlFor="use-current-location">Use my current location</Label>
        </div>

        {locationStatus === "loading" && <p className="text-xs text-muted-foreground">Getting your location...</p>}

        {locationStatus === "error" && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            <span>Unable to get your location. Please enter coordinates manually.</span>
          </div>
        )}

        {currentLocation && (
          <div className="text-xs text-muted-foreground">
            Current reference point: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </div>
        )}

        {!useCurrentLocation && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="latitude" className="text-xs">
                  Latitude
                </Label>
                <Input
                  id="latitude"
                  type="text"
                  placeholder="-90 to 90"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="longitude" className="text-xs">
                  Longitude
                </Label>
                <Input
                  id="longitude"
                  type="text"
                  placeholder="-180 to 180"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                />
              </div>
            </div>
            <Button size="sm" onClick={handleCustomLocationSubmit} className="w-full">
              Set Custom Location
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
