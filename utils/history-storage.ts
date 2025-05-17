import type { EarthquakeChange, EarthquakeHistory } from "@/types/earthquake"

const HISTORY_STORAGE_KEY = "earthquakeHistoryData"
const MAX_HISTORY_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

/**
 * Load earthquake history from localStorage
 * @returns The stored earthquake history or an empty object if none exists
 */
export function loadEarthquakeHistory(): EarthquakeHistory {
  if (typeof window === "undefined") return {}

  try {
    const storedData = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!storedData) return {}

    const parsedData = JSON.parse(storedData) as EarthquakeHistory

    // Filter out old history entries (older than 30 days)
    const now = Date.now()
    const filteredHistory: EarthquakeHistory = {}

    Object.entries(parsedData).forEach(([earthquakeId, changes]) => {
      // Filter changes to only include those from the last month
      const recentChanges = changes.filter((change) => {
        return now - change.timestamp < MAX_HISTORY_AGE_MS
      })

      // Only keep earthquakes that have recent changes
      if (recentChanges.length > 0) {
        filteredHistory[earthquakeId] = recentChanges
      }
    })

    return filteredHistory
  } catch (error) {
    console.error("Error loading earthquake history from localStorage:", error)
    return {}
  }
}

/**
 * Save earthquake history to localStorage
 * @param history The earthquake history to save
 */
export function saveEarthquakeHistory(history: EarthquakeHistory): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.error("Error saving earthquake history to localStorage:", error)
  }
}

/**
 * Add changes to the earthquake history and save to localStorage
 * @param history Current earthquake history
 * @param earthquakeId ID of the earthquake
 * @param changes Array of changes to add
 * @returns Updated earthquake history
 */
export function addToEarthquakeHistory(
  history: EarthquakeHistory,
  earthquakeId: string,
  changes: EarthquakeChange[],
): EarthquakeHistory {
  if (!changes.length) return history

  const updatedHistory = { ...history }

  // Initialize history array if it doesn't exist
  if (!updatedHistory[earthquakeId]) {
    updatedHistory[earthquakeId] = []
  }

  // Add new changes to history
  updatedHistory[earthquakeId] = [...updatedHistory[earthquakeId], ...changes]

  // Save to localStorage
  saveEarthquakeHistory(updatedHistory)

  return updatedHistory
}

/**
 * Clean up old history entries (older than 30 days)
 * @param history Current earthquake history
 * @returns Cleaned earthquake history
 */
export function cleanupOldHistory(history: EarthquakeHistory): EarthquakeHistory {
  const now = Date.now()
  const cleanedHistory: EarthquakeHistory = {}

  Object.entries(history).forEach(([earthquakeId, changes]) => {
    // Filter changes to only include those from the last month
    const recentChanges = changes.filter((change) => {
      return now - change.timestamp < MAX_HISTORY_AGE_MS
    })

    // Only keep earthquakes that have recent changes
    if (recentChanges.length > 0) {
      cleanedHistory[earthquakeId] = recentChanges
    }
  })

  // Save the cleaned history
  saveEarthquakeHistory(cleanedHistory)

  return cleanedHistory
}
