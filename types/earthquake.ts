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
