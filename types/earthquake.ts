// Define the interface for earthquake changes
export interface EarthquakeChange {
  property: string
  oldValue: any
  newValue: any
  timestamp: number
}

// Define the interface for earthquake history
export interface EarthquakeHistory {
  [id: string]: EarthquakeChange[]
}

// Define the interface for newly detected earthquakes
export interface NewEarthquake {
  id: string
  detectedAt: number
}

// Define the interface for the volcanoyt.com API earthquake data
export interface EarthquakeInfo {
  _id: string
  source: string
  place: string
  type: string
  time: number // UTC timestamp in seconds
  magnitude: number
  depth: number
  intensity: number
  tsunami: number
  status: number
  location: {
    type: "Point"
    coordinates: [number, number] // [longitude, latitude]
  }
  city: {
    id: number
    name: string
    country: string
    distance: number
  }
}
