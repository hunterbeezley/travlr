// Module-level (not React state) in-memory cache for the nearby-POI Places
// lookup, so re-panning to an already-visited area doesn't re-hit the API.
// Keyed on a coarse grid cell so small re-pans within the same neighborhood
// still hit the cache.

const TTL_MS = 5 * 60 * 1000 // 5 minutes
const GRID_PRECISION = 3 // ~110m cells at this many decimal places

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function buildKey(lat: number, lng: number, radius: number, types: string[]): string {
  const gridLat = lat.toFixed(GRID_PRECISION)
  const gridLng = lng.toFixed(GRID_PRECISION)
  const sortedTypes = [...types].sort().join(',')
  return `${gridLat}:${gridLng}:${radius}:${sortedTypes}`
}

export function getCachedPlaces<T>(lat: number, lng: number, radius: number, types: string[]): T | null {
  const key = buildKey(lat, lng, radius, types)
  const entry = cache.get(key)
  if (!entry || entry.expiresAt < Date.now()) {
    if (entry) cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCachedPlaces<T>(lat: number, lng: number, radius: number, types: string[], data: T): void {
  const key = buildKey(lat, lng, radius, types)
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS })
}
