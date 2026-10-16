import { dataUrlToBlob } from "@/lib/images"
import type { ExportBundle, PhotoRef, Stop, Trip } from "@/lib/types"

const TRIP_KEY = "travel-footprints-v1"
const DB_NAME = "travel-footprints"
const STORE = "photos"

export type TripSnapshot = {
  trips: Trip[]
  ready: boolean
}

const serverSnapshot: TripSnapshot = { trips: [], ready: false }
const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedSnapshot: TripSnapshot = { trips: [], ready: true }

function emitTrips() {
  listeners.forEach((listener) => listener())
}

export function subscribeTrips(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTripSnapshot(): TripSnapshot {
  try {
    const raw = localStorage.getItem(TRIP_KEY) ?? "[]"
    if (raw === cachedRaw) return cachedSnapshot
    cachedRaw = raw
    cachedSnapshot = { trips: parseTrips(raw), ready: true }
    return cachedSnapshot
  } catch {
    if (cachedRaw === "__error__") return cachedSnapshot
    cachedRaw = "__error__"
    cachedSnapshot = { trips: [], ready: true }
    return cachedSnapshot
  }
}

export function getServerTripSnapshot() {
  return serverSnapshot
}

export function writeTrips(trips: Trip[]) {
  const raw = JSON.stringify(trips)
  localStorage.setItem(TRIP_KEY, raw)
  cachedRaw = raw
  cachedSnapshot = { trips, ready: true }
  emitTrips()
}

export function updateTrips(updater: (current: Trip[]) => Trip[]) {
  writeTrips(updater(getTripSnapshot().trips))
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function parseTrips(raw: string): Trip[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTrip)
  } catch {
    return []
  }
}

export async function savePhotoBlob(id: string, blob: Blob) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function getPhotoBlob(id: string) {
  const db = await openDb()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const request = tx.objectStore(STORE).get(id)
    request.onsuccess = () => {
      const result = request.result as Blob | undefined
      resolve(result)
    }
    request.onerror = () => reject(request.error)
  })
  db.close()
  return blob
}

export async function deletePhotoBlob(id: string) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

function isStop(value: unknown): value is Stop {
  if (!value || typeof value !== "object") return false
  const stop = value as Stop
  return (
    typeof stop.id === "string" &&
    typeof stop.name === "string" &&
    typeof stop.country === "string" &&
    typeof stop.countryCode === "string" &&
    typeof stop.lat === "number" &&
    typeof stop.lng === "number"
  )
}

function isPhoto(value: unknown): value is PhotoRef {
  if (!value || typeof value !== "object") return false
  const photo = value as PhotoRef
  return typeof photo.id === "string" && typeof photo.kind === "string"
}

export function isTrip(value: unknown): value is Trip {
  if (!value || typeof value !== "object") return false
  const trip = value as Trip
  return (
    typeof trip.id === "string" &&
    typeof trip.title === "string" &&
    typeof trip.startDate === "string" &&
    typeof trip.endDate === "string" &&
    Array.isArray(trip.stops) &&
    trip.stops.every(isStop) &&
    Array.isArray(trip.photos) &&
    trip.photos.every(isPhoto)
  )
}

export async function importBundle(bundle: ExportBundle) {
  const trips = bundle.trips.filter(isTrip)
  for (const photo of bundle.photos) {
    if (!photo.id || !photo.dataUrl?.startsWith("data:")) continue
    await savePhotoBlob(photo.id, dataUrlToBlob(photo.dataUrl))
  }
  return trips
}
