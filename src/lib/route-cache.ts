// Simple in-memory stale-while-revalidate cache for dashboard API calls.
// Data persists across client-side navigations for TTL seconds.

const store = new Map<string, { data: unknown; at: number }>()
const TTL_MS = 60_000 // 60 s

export function readCache<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > TTL_MS) { store.delete(key); return null }
  return entry.data as T
}

export function writeCache(key: string, data: unknown) {
  store.set(key, { data, at: Date.now() })
}

export function invalidateCache(key: string) {
  store.delete(key)
}
