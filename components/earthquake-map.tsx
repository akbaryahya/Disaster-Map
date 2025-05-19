"use client"

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MAP_LAYERS } from "./map-layer-selector"

// Define the props interface
interface EarthquakeMapProps {
  earthquakes: any[]
  mapLayerId?: string
  onEarthquakeSelect?: (id: string) => void
  highlightedEarthquakeId?: string | null
  userLocation?: { lat: number; lng: number } | null
}

// Define the ref interface for map controls
export interface EarthquakeMapRef {
  flyToEarthquake: (earthquakeId: string) => void
  flyToCoordinates: (lat: number, lng: number, zoom?: number) => void
}

const EarthquakeMap = forwardRef<EarthquakeMapRef, EarthquakeMapProps>(
  ({ earthquakes, mapLayerId = "osm", onEarthquakeSelect, highlightedEarthquakeId, userLocation }, ref) => {
    // Create a ref to store the map instance
    const mapRef = useRef<L.Map | null>(null)
    // Create a ref to store the layer group for markers
    const markersLayerRef = useRef<L.LayerGroup | null>(null)
    // Create a ref to store the current tile layer
    const tileLayerRef = useRef<L.TileLayer | null>(null)
    // Create a ref to store markers by ID for quick access
    const markersById = useRef<Record<string, L.Marker>>({})
    // Create a ref to store the currently highlighted marker
    const highlightedMarkerRef = useRef<L.Marker | null>(null)
    // Create a ref to store the user location marker
    const userLocationMarkerRef = useRef<L.Marker | null>(null)
    // Create a ref to store the user location circle
    const userLocationCircleRef = useRef<L.Circle | null>(null)
    // Create a ref to store the earthquakes data for direct access
    const earthquakesDataRef = useRef<any[]>([])

    // Update earthquakes data ref when earthquakes prop changes
    useEffect(() => {
      earthquakesDataRef.current = earthquakes
    }, [earthquakes])

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      flyToEarthquake: (earthquakeId: string) => {
        console.log(`Attempting to fly to earthquake: ${earthquakeId}`)

        // First try to find the marker directly
        const marker = markersById.current[earthquakeId]

        if (marker && mapRef.current) {
          console.log(`Found marker for ${earthquakeId}, flying to it`)
          // Get the marker's position
          const latLng = marker.getLatLng()

          // Fly to the marker position with animation
          mapRef.current.flyTo(latLng, 10, {
            animate: true,
            duration: 1,
          })

          // Highlight the selected marker
          highlightMarker(marker)

          // Open the popup after a short delay to allow the map to finish flying
          setTimeout(() => {
            marker.openPopup()
          }, 1000)

          return
        }

        // If marker not found, try to find the earthquake in the data
        const earthquake = earthquakesDataRef.current.find((quake) => quake.id === earthquakeId)

        if (earthquake && mapRef.current) {
          console.log(`Found earthquake data for ${earthquakeId}, flying to coordinates`)
          const [longitude, latitude] = earthquake.geometry.coordinates

          // Fly to the coordinates
          mapRef.current.flyTo([latitude, longitude], 10, {
            animate: true,
            duration: 1,
          })

          // Try to find the marker again after a short delay
          // This handles cases where the marker might be created after this function is called
          setTimeout(() => {
            const marker = markersById.current[earthquakeId]
            if (marker) {
              highlightMarker(marker)
              marker.openPopup()
            }
          }, 500)

          return
        }

        console.error(`Could not find earthquake or marker for ID: ${earthquakeId}`)
      },

      flyToCoordinates: (lat: number, lng: number, zoom = 10) => {
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], zoom, {
            animate: true,
            duration: 1,
          })
        }
      },
    }))

    // Function to highlight a marker
    const highlightMarker = (marker: L.Marker) => {
      // Reset previous highlighted marker if exists
      if (highlightedMarkerRef.current) {
        const element = highlightedMarkerRef.current.getElement()
        if (element) {
          element.classList.remove("earthquake-marker-highlighted")
        }
      }

      // Highlight the new marker
      const element = marker.getElement()
      if (element) {
        element.classList.add("earthquake-marker-highlighted")
      }

      // Bring the marker to the front
      marker.setZIndexOffset(1000)

      // Store the highlighted marker
      highlightedMarkerRef.current = marker
    }

    // Initialize the map when the component mounts
    useEffect(() => {
      if (!mapRef.current) {
        // Create the map instance
        mapRef.current = L.map("map", {
          zoomControl: false, // We'll add custom controls
          attributionControl: true,
        }).setView([20, 0], 2)

        // Create a layer group for markers
        markersLayerRef.current = L.layerGroup().addTo(mapRef.current)

        // Add zoom control to the top-left
        L.control
          .zoom({
            position: "topleft",
          })
          .addTo(mapRef.current)

        // Add CSS for highlighted markers
        const style = document.createElement("style")
        style.textContent = `
          .earthquake-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            font-weight: bold;
            color: white;
            border: 1px solid rgba(0, 0, 0, 0.5);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }
          .earthquake-marker-highlighted {
            transform: scale(1.2);
            box-shadow: 0 0 0 2px white, 0 0 8px rgba(0, 0, 0, 0.5);
            z-index: 1000 !important;
          }
          .earthquake-marker-minor {
            background-color: #22c55e;
          }
          .earthquake-marker-light {
            background-color: #eab308;
          }
          .earthquake-marker-moderate {
            background-color: #f97316;
          }
          .earthquake-marker-strong {
            background-color: #ef4444;
          }
          .user-location-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background-color: #3b82f6;
            color: white;
            border: 2px solid white;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
          }
        `
        document.head.appendChild(style)
      }

      // Clean up function to run when component unmounts
      return () => {
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
          markersLayerRef.current = null
          tileLayerRef.current = null
          markersById.current = {}
          highlightedMarkerRef.current = null
          userLocationMarkerRef.current = null
          userLocationCircleRef.current = null
        }
      }
    }, [])

    // Update the tile layer when the mapLayerId changes
    useEffect(() => {
      if (!mapRef.current) return

      // Find the selected layer configuration
      const selectedLayer = MAP_LAYERS.find((layer) => layer.id === mapLayerId) || MAP_LAYERS[0]

      // Remove the current tile layer if it exists
      if (tileLayerRef.current) {
        tileLayerRef.current.remove()
      }

      // Add the new tile layer with the layer's maxZoom if specified
      tileLayerRef.current = L.tileLayer(selectedLayer.url, {
        attribution: selectedLayer.attribution,
        maxZoom: selectedLayer.maxZoom || 18,
      }).addTo(mapRef.current)
    }, [mapLayerId])

    // Update user location marker when userLocation changes
    useEffect(() => {
      if (!mapRef.current) return

      // Remove existing user location marker and circle
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove()
        userLocationMarkerRef.current = null
      }

      if (userLocationCircleRef.current) {
        userLocationCircleRef.current.remove()
        userLocationCircleRef.current = null
      }

      // Add new user location marker if location is available
      if (userLocation) {
        // Create custom icon for user location
        const icon = L.divIcon({
          className: "user-location-marker",
          html: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        // Create marker
        userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon,
          zIndexOffset: 1000,
        })
          .addTo(mapRef.current)
          .bindPopup("Your Location")
      }
    }, [userLocation])

    // Update markers when earthquakes data changes
    useEffect(() => {
      if (!mapRef.current || !markersLayerRef.current || !earthquakes.length) return

      // Clear existing markers
      markersLayerRef.current.clearLayers()
      markersById.current = {}
      highlightedMarkerRef.current = null

      // Add new markers for each earthquake
      earthquakes.forEach((quake) => {
        const { coordinates } = quake.geometry
        const { mag, place, time, url } = quake.properties

        // Leaflet uses [lat, lng] while GeoJSON uses [lng, lat, depth]
        const lat = coordinates[1]
        const lng = coordinates[0]
        const depth = coordinates[2]

        // Determine marker class based on magnitude
        const getMagnitudeClass = (magnitude: number) => {
          if (magnitude < 2) return "earthquake-marker-minor"
          if (magnitude < 4) return "earthquake-marker-light"
          if (magnitude < 6) return "earthquake-marker-moderate"
          return "earthquake-marker-strong"
        }

        // Determine marker size based on magnitude
        const getMarkerSize = (magnitude: number) => {
          // Base size for all markers
          const baseSize = 30

          // Increase size for larger magnitudes
          if (magnitude >= 6) return baseSize + 10
          if (magnitude >= 4) return baseSize + 5
          return baseSize
        }

        const markerSize = getMarkerSize(mag)

        // Create custom icon with magnitude text
        const icon = L.divIcon({
          className: `earthquake-marker ${getMagnitudeClass(mag)}`,
          html: `${mag.toFixed(1)}M`,
          iconSize: [markerSize, 18],
          iconAnchor: [markerSize / 2, markerSize / 2],
        })

        // Create marker with the custom icon
        const marker = L.marker([lat, lng], {
          icon: icon,
          riseOnHover: true,
        })

        // Add popup with earthquake information
        let popupContent = `
          <strong>Magnitude:</strong> ${mag}<br>
          <strong>Location:</strong> ${place}<br>
          <strong>Time:</strong> ${new Date(time).toLocaleString()}<br>
          <strong>Depth:</strong> ${depth.toFixed(1)} km<br>
        `

        // Add distance information if available
        if (quake.distance !== undefined) {
          popupContent += `<strong>Distance:</strong> ${quake.distance.toFixed(1)} km from you<br>`
        }

        popupContent += `<a href="${url}" target="_blank" rel="noopener noreferrer">More info</a>`

        marker.bindPopup(popupContent)

        // Add click handler to select the earthquake
        if (onEarthquakeSelect) {
          marker.on("click", () => {
            onEarthquakeSelect(quake.id)
            highlightMarker(marker)
          })
        }

        // Store the marker by ID for quick access
        markersById.current[quake.id] = marker

        // Add marker to the layer group
        marker.addTo(markersLayerRef.current!)
      })

      // Log the number of markers created for debugging
      //console.log(`Created ${Object.keys(markersById.current).length} markers`)
    }, [earthquakes, onEarthquakeSelect])

    // Update highlighted marker when highlightedEarthquakeId changes
    useEffect(() => {
      if (highlightedEarthquakeId && markersById.current[highlightedEarthquakeId]) {
        highlightMarker(markersById.current[highlightedEarthquakeId])
      }
    }, [highlightedEarthquakeId])

    return <div id="map" className="h-full w-full" />
  },
)

// Add display name for better debugging
EarthquakeMap.displayName = "EarthquakeMap"

export default EarthquakeMap
