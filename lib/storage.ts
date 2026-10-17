import { dataUrlToBlob } from "@/lib/images"
import type { ExportBundle, FlightRecord, PhotoRef, StayRecord, Stop, Trip } from "@/lib/types"

const LEGACY_TRIP_KEY = "travel-footprints-v1"
const BOOKS_KEY = "travel-footprints-books"
const DB_NAME = "travel-footprints"
const STORE = "photos"

export type FootprintBook = {
  id: string
  name: string
}

type BookStore = {
  activeId: string
  books: FootprintBook[]
}

export type TripSnapshot = {
  trips: Trip[]
  ready: boolean
}

const serverSnapshot: TripSnapshot = { trips: [], ready: false }
const emptyBooks: BookStore = { activeId: "", books: [] }
const listeners = new Set<() => void>()
const bookListeners = new Set<() => void>()
let cachedKey = ""
let cachedRaw: string | null = null
let cachedSnapshot: TripSnapshot = { trips: [], ready: true }
let bookCacheRaw: string | null = null
let bookCache: BookStore = emptyBooks

function emitTrips() {
  listeners.forEach((listener) => listener())
}

function emitBooks() {
  bookListeners.forEach((listener) => listener())
}

function invalidateStores() {
  cachedKey = ""
  cachedRaw = null
  bookCacheRaw = null
  emitBooks()
  emitTrips()
}

function tripStorageKey(bookId: string) {
  return `${LEGACY_TRIP_KEY}:${bookId}`
}

function currentTripKey() {
  const store = readBookStore()
  if (!store) return LEGACY_TRIP_KEY
  return tripStorageKey(store.activeId)
}

function readBookStore(): BookStore | null {
  try {
    const raw = localStorage.getItem(BOOKS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BookStore>
    if (!Array.isArray(parsed.books)) return null
    const books = parsed.books.filter(
      (book): book is FootprintBook =>
        !!book && typeof book.id === "string" && typeof book.name === "string" && book.name.trim().length > 0,
    )
    if (books.length === 0) return null
    const activeId = books.some((book) => book.id === parsed.activeId) ? parsed.activeId ?? books[0].id : books[0].id
    return { activeId, books }
  } catch {
    return null
  }
}

export function ensureBooks() {
  if (typeof localStorage === "undefined") return
  if (readBookStore()) return
  const id = crypto.randomUUID()
  const legacy = localStorage.getItem(LEGACY_TRIP_KEY)
  const store: BookStore = { activeId: id, books: [{ id, name: "我的足跡" }] }
  localStorage.setItem(BOOKS_KEY, JSON.stringify(store))
  localStorage.setItem(tripStorageKey(id), legacy ?? "[]")
  if (legacy !== null) localStorage.removeItem(LEGACY_TRIP_KEY)
  invalidateStores()
}

export function subscribeTrips(listener: () => void) {
  ensureBooks()
  cachedKey = ""
  cachedRaw = null
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === BOOKS_KEY || event.key?.startsWith(LEGACY_TRIP_KEY)) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function getTripSnapshot(): TripSnapshot {
  try {
    const key = currentTripKey()
    const raw = localStorage.getItem(key) ?? "[]"
    if (key === cachedKey && raw === cachedRaw) return cachedSnapshot
    cachedKey = key
    cachedRaw = raw
    cachedSnapshot = { trips: parseTrips(raw), ready: true }
    return cachedSnapshot
  } catch {
    if (cachedRaw === "__error__") return cachedSnapshot
    cachedKey = ""
    cachedRaw = "__error__"
    cachedSnapshot = { trips: [], ready: true }
    return cachedSnapshot
  }
}

export function getServerTripSnapshot() {
  return serverSnapshot
}

export function writeTrips(trips: Trip[]) {
  const key = currentTripKey()
  const raw = JSON.stringify(trips)
  localStorage.setItem(key, raw)
  cachedKey = key
  cachedRaw = raw
  cachedSnapshot = { trips, ready: true }
  emitTrips()
}

export function subscribeBooks(listener: () => void) {
  ensureBooks()
  bookCacheRaw = null
  bookListeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === BOOKS_KEY) listener()
  }
  window.addEventListener("storage", onStorage)
  queueMicrotask(listener)
  return () => {
    bookListeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function getBookSnapshot() {
  try {
    const raw = localStorage.getItem(BOOKS_KEY) ?? ""
    if (raw === bookCacheRaw) return bookCache
    bookCacheRaw = raw
    bookCache = readBookStore() ?? emptyBooks
    return bookCache
  } catch {
    return emptyBooks
  }
}

export function getServerBookSnapshot() {
  return emptyBooks
}

export function createBook(name: string) {
  ensureBooks()
  const store = readBookStore()
  const trimmed = name.trim().slice(0, 24)
  if (!store || !trimmed) return null
  const book = { id: crypto.randomUUID(), name: trimmed }
  store.books.push(book)
  store.activeId = book.id
  localStorage.setItem(BOOKS_KEY, JSON.stringify(store))
  localStorage.setItem(tripStorageKey(book.id), "[]")
  invalidateStores()
  return book
}

export function switchBook(id: string) {
  const store = readBookStore()
  if (!store || !store.books.some((book) => book.id === id)) return
  store.activeId = id
  localStorage.setItem(BOOKS_KEY, JSON.stringify(store))
  invalidateStores()
}

export function removeBook(id: string) {
  const store = readBookStore()
  if (!store || store.books.length < 2) return []
  const removedTrips = parseTrips(localStorage.getItem(tripStorageKey(id)) ?? "[]")
  store.books = store.books.filter((book) => book.id !== id)
  if (store.books.length === 0) return []
  if (store.activeId === id) store.activeId = store.books[0]?.id ?? ""
  localStorage.setItem(BOOKS_KEY, JSON.stringify(store))
  localStorage.removeItem(tripStorageKey(id))
  invalidateStores()
  return removedTrips
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
    return parsed.filter(isTrip).map(normalizeTrip)
  } catch {
    return []
  }
}

function normalizeTrip(trip: Trip): Trip {
  const raw = trip as Trip & { flights?: unknown; stays?: unknown }
  return {
    ...trip,
    flights: Array.isArray(raw.flights) ? raw.flights.flatMap(normalizeFlight) : [],
    stays: Array.isArray(raw.stays) ? raw.stays.flatMap(normalizeStay) : [],
  }
}

function normalizeFlight(value: unknown): FlightRecord[] {
  if (!value || typeof value !== "object") return []
  const flight = value as Partial<FlightRecord>
  if (typeof flight.id !== "string") return []
  const aircraft = typeof flight.aircraft === "string" ? flight.aircraft : ""
  const route = typeof flight.route === "string" ? flight.route : ""
  if (!aircraft.trim() && !route.trim()) return []
  return [{ id: flight.id, aircraft, route }]
}

function normalizeStay(value: unknown): StayRecord[] {
  if (!value || typeof value !== "object") return []
  const stay = value as Partial<StayRecord>
  if (typeof stay.id !== "string" || typeof stay.name !== "string" || !stay.name.trim()) return []
  return [{ id: stay.id, name: stay.name, stopId: typeof stay.stopId === "string" ? stay.stopId : undefined }]
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
