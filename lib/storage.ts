import { AURORA_TITLE, AURORA_TRIP_ID, createAuroraTrip } from "@/lib/aurora-trip"
import { FUKUOKA_TITLE, FUKUOKA_TRIP_ID, createFukuokaTrip } from "@/lib/fukuoka-trip"
import { KANSAI_TITLE, KANSAI_TRIP_ID, createKansaiTrip } from "@/lib/kansai-trip"
import { JAPAN_DEC_TITLE, JAPAN_DEC_TRIP_ID, createJapanDecemberTrip } from "@/lib/japan-dec-trip"
import { TOKYO_MAY_TITLE, TOKYO_MAY_TRIP_ID, createTokyoMayTrip } from "@/lib/tokyo-may-trip"
import { YOKOHAMA_TITLE, YOKOHAMA_TRIP_ID, createYokohamaTrip } from "@/lib/yokohama-trip"
import {
  GERMANY_2017_TITLE,
  GERMANY_2017_TRIP_ID,
  JAPAN_JUN_2023_TITLE,
  JAPAN_JUN_2023_TRIP_ID,
  createGermany2017Trip,
  createJapanJun2023Trip,
} from "@/lib/outline-trips"
import { JAPAN_2019_TITLE, JAPAN_2019_TRIP_ID, createJapan2019Trip } from "@/lib/japan-2019-trip"
import { dataUrlToBlob } from "@/lib/images"
import type { ExportBundle, FlightRecord, PhotoRef, StayRecord, Stop, Trip } from "@/lib/types"

const AURORA_SEED_KEY = "travel-footprints-seeded-aurora"
const AURORA_FOCUS_FLAG = "travel-footprints-aurora-focused"
const YOKOHAMA_FOCUS_FLAG = "travel-footprints-yokohama-focused"
const FUKUOKA_FOCUS_FLAG = "travel-footprints-fukuoka-focused"
const KANSAI_FOCUS_FLAG = "travel-footprints-kansai-focused"
const KANSAI_YEAR_FOCUS_FLAG = "travel-footprints-kansai-2016-focused"
const KANSAI_MAP_FLAG = "travel-footprints-kansai-2016-map"
const TOKYO_MAY_FOCUS_FLAG = "travel-footprints-tokyo-may-focused"
const JAPAN_DEC_FOCUS_FLAG = "travel-footprints-japan-dec-focused"
const JAPAN_JUN_2023_FOCUS_FLAG = "travel-footprints-japan-jun-2023-focused"
const GERMANY_2017_FOCUS_FLAG = "travel-footprints-germany-2017-focused"
const JAPAN_2019_FOCUS_FLAG = "travel-footprints-japan-2019-focused"
const AURORA_PORTS = [
  "us-seattle",
  "ca-inside-passage",
  "us-juneau",
  "us-skagway",
  "us-dawes",
  "us-ketchikan",
  "ca-vancouver",
  "ca-yellowknife",
]

let pendingAuroraFocus: string | null = null
let createdBookThisPage = false

export const PUBLISHED_BOOK_ID = "published-footprints"
const PUBLISHED_REVISION_KEY = "travel-footprints-published-at"

export function peekAuroraFocus() {
  return pendingAuroraFocus
}

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
  createdBookThisPage = true
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
  ensureAuroraTrip()
  ensureYokohamaTrip()
  ensureFukuokaTrip()
  ensureKansaiTrip()
  ensureTokyoMayTrip()
  ensureJapanDecemberTrip()
  focusKansai2016()
  ensureJapanJun2023Trip()
  ensureGermany2017Trip()
  ensureJapan2019Trip()
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

function sameAuroraTrip(trip: Trip) {
  return trip.id === AURORA_TRIP_ID || trip.title.trim() === AURORA_TITLE
}

function auroraTripComplete(trip: Trip) {
  const ids = new Set(trip.stops.map((stop) => stop.cityId))
  return AURORA_PORTS.every((id) => ids.has(id))
}

function ensureAuroraTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameAuroraTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !auroraTripComplete(current)) {
    const canInsert = !current && localStorage.getItem(AURORA_SEED_KEY) !== "1"
    if (current || canInsert) {
      const created = createAuroraTrip()
      if (created) {
        const merged: Trip = current
          ? {
              ...created,
              id: current.id,
              photos: current.photos,
              flights: current.flights ?? [],
              notes: current.notes?.includes("換日線") ? current.notes : created.notes,
              createdAt: current.createdAt,
            }
          : created
        existing = [merged, ...existing.filter((trip) => !sameAuroraTrip(trip))]
        writeTrips(existing)
        localStorage.setItem(AURORA_SEED_KEY, "1")
        current = merged
      }
    }
  } else {
    localStorage.setItem(AURORA_SEED_KEY, "1")
  }
  if (current && localStorage.getItem(AURORA_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(AURORA_FOCUS_FLAG, "1")
  }
}

function sameYokohamaTrip(trip: Trip) {
  if (trip.id === YOKOHAMA_TRIP_ID) return true
  const title = trip.title.replace(/鐮/g, "鎌")
  if (title.includes("橫濱") && title.includes("鎌倉")) return true
  return trip.startDate === "2026-01-17" && trip.stops.some((stop) => stop.cityId === "jp-yokohama")
}

function yokohamaTripCurrent(trip: Trip) {
  const ids = new Set(trip.stops.map((stop) => stop.cityId))
  const flights = trip.flights.map((flight) => `${flight.aircraft} ${flight.route}`).join(" ")
  const stays = trip.stays.map((stay) => stay.name).join(" ")
  return (
    ids.has("jp-yokohama") &&
    ids.has("jp-kamakura") &&
    flights.includes("JL96") &&
    flights.includes("JL99") &&
    stays.includes("希爾頓") &&
    trip.startDate === "2026-01-17" &&
    trip.endDate === "2026-01-20"
  )
}

function ensureYokohamaTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameYokohamaTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !yokohamaTripCurrent(current)) {
    const canInsert = !current && localStorage.getItem(YOKOHAMA_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createYokohamaTrip()
      if (created) {
        const merged: Trip = current
          ? {
              ...created,
              id: current.id,
              photos: current.photos,
              createdAt: current.createdAt,
            }
          : created
        if (merged.title !== YOKOHAMA_TITLE) merged.title = YOKOHAMA_TITLE
        existing = [merged, ...existing.filter((trip) => !sameYokohamaTrip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(YOKOHAMA_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(YOKOHAMA_FOCUS_FLAG, "1")
  }
}

function sameFukuokaTrip(trip: Trip) {
  if (trip.id === FUKUOKA_TRIP_ID) return true
  if (trip.title.includes("福岡") && trip.title.includes("4天3夜")) return true
  return trip.startDate === "2025-10-23" && trip.stops.some((stop) => stop.cityId === "jp-kitakyushu")
}

function fukuokaTripCurrent(trip: Trip) {
  const ids = new Set(trip.stops.map((stop) => stop.cityId))
  const flights = trip.flights.map((flight) => `${flight.aircraft} ${flight.route}`).join(" ")
  const stays = trip.stays.map((stay) => stay.name).join(" ")
  return (
    ids.has("jp-fukuoka") &&
    ids.has("jp-kitakyushu") &&
    flights.includes("BR106") &&
    flights.includes("JX841") &&
    stays.includes("Blossom") &&
    stays.includes("REI") &&
    trip.startDate === "2025-10-23" &&
    trip.endDate === "2025-10-26"
  )
}

function ensureFukuokaTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameFukuokaTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !fukuokaTripCurrent(current)) {
    const canInsert = !current && localStorage.getItem(FUKUOKA_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createFukuokaTrip()
      if (created) {
        const merged: Trip = current
          ? {
              ...created,
              id: current.id,
              photos: current.photos,
              createdAt: current.createdAt,
            }
          : created
        if (merged.title !== FUKUOKA_TITLE) merged.title = FUKUOKA_TITLE
        existing = [merged, ...existing.filter((trip) => !sameFukuokaTrip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(FUKUOKA_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(FUKUOKA_FOCUS_FLAG, "1")
  }
}

function sameKansaiTrip(trip: Trip) {
  if (trip.id === KANSAI_TRIP_ID) return true
  if (
    (trip.startDate === "2016-08-06" || trip.startDate === "2026-08-06") &&
    trip.stops.some((stop) => stop.cityId === "jp-shirakawa")
  ) {
    return true
  }
  return trip.title.includes("關西") && (trip.startDate.startsWith("2016-08") || trip.startDate.startsWith("2026-08"))
}

function kansaiTripCurrent(trip: Trip) {
  const ids = new Set(trip.stops.map((stop) => stop.cityId))
  return (
    ["jp-osaka", "jp-kyoto", "jp-himeji", "jp-kobe", "jp-arima", "jp-nara", "jp-shirakawa"].every((id) => ids.has(id)) &&
    trip.startDate === "2016-08-06" &&
    trip.endDate === "2016-08-13" &&
    trip.title.includes("2016") &&
    trip.stops.some((stop) => stop.note?.includes("環球影城"))
  )
}

function ensureKansaiTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameKansaiTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !kansaiTripCurrent(current)) {
    const canInsert = !current && localStorage.getItem(KANSAI_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createKansaiTrip()
      if (created) {
        const merged: Trip = current
          ? {
              ...created,
              id: current.id,
              photos: current.photos,
              createdAt: current.createdAt,
            }
          : created
        if (merged.title !== KANSAI_TITLE) merged.title = KANSAI_TITLE
        existing = [merged, ...existing.filter((trip) => !sameKansaiTrip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(KANSAI_YEAR_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(KANSAI_FOCUS_FLAG, "1")
    localStorage.setItem(KANSAI_YEAR_FOCUS_FLAG, "1")
  }
}

function focusKansai2016() {
  if (typeof localStorage === "undefined") return
  if (localStorage.getItem(KANSAI_MAP_FLAG) === "1") return
  const current = getTripSnapshot().trips.find(sameKansaiTrip)
  if (!current || !kansaiTripCurrent(current)) return
  pendingAuroraFocus = current.id
  localStorage.setItem(KANSAI_FOCUS_FLAG, "1")
  localStorage.setItem(KANSAI_YEAR_FOCUS_FLAG, "1")
  localStorage.setItem(KANSAI_MAP_FLAG, "1")
}

function sameJapanJun2023Trip(trip: Trip) {
  if (trip.id === JAPAN_JUN_2023_TRIP_ID) return true
  return trip.startDate === "2023-06-02" && trip.title.includes("日本")
}

function japanJun2023TripCurrent(trip: Trip) {
  return (
    trip.title === JAPAN_JUN_2023_TITLE &&
    trip.startDate === "2023-06-02" &&
    trip.endDate === "2023-06-05" &&
    trip.stops.length === 1 &&
    trip.stops[0]?.name === "日本" &&
    trip.stops[0]?.cityId === undefined &&
    trip.flights.length === 0 &&
    trip.stays.length === 0 &&
    trip.notes.includes("詳細行程還沒找到")
  )
}

function ensureJapanJun2023Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameJapanJun2023Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !japanJun2023TripCurrent(current)) {
    const canInsert = !current && localStorage.getItem(JAPAN_JUN_2023_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createJapanJun2023Trip()
      const merged: Trip = current
        ? {
            ...created,
            id: current.id,
            photos: current.photos,
            createdAt: current.createdAt,
          }
        : created
      existing = [merged, ...existing.filter((trip) => !sameJapanJun2023Trip(trip))]
      writeTrips(existing)
      current = merged
    }
  }
  if (current && localStorage.getItem(JAPAN_JUN_2023_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(JAPAN_JUN_2023_FOCUS_FLAG, "1")
  }
}

function sameGermany2017Trip(trip: Trip) {
  if (trip.id === GERMANY_2017_TRIP_ID) return true
  return trip.title.includes("2017") && trip.title.includes("德國")
}

function germany2017TripCurrent(trip: Trip) {
  return (
    trip.title === GERMANY_2017_TITLE &&
    trip.startDate === "2017-01-01" &&
    trip.endDate === "2017-12-31" &&
    trip.stops.length === 1 &&
    trip.stops[0]?.name === "德國" &&
    trip.stops[0]?.countryCode === "DE" &&
    trip.stops[0]?.cityId === undefined &&
    trip.stops[0]?.date === undefined &&
    trip.flights.length === 0 &&
    trip.stays.length === 0 &&
    trip.notes.includes("詳細行程還沒找到")
  )
}

function ensureGermany2017Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameGermany2017Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !germany2017TripCurrent(current)) {
    const canInsert = !current && localStorage.getItem(GERMANY_2017_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createGermany2017Trip()
      const merged: Trip = current
        ? {
            ...created,
            id: current.id,
            photos: current.photos,
            createdAt: current.createdAt,
          }
        : created
      existing = [merged, ...existing.filter((trip) => !sameGermany2017Trip(trip))]
      writeTrips(existing)
      current = merged
    }
  }
  if (current && localStorage.getItem(GERMANY_2017_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(GERMANY_2017_FOCUS_FLAG, "1")
  }
}

function sameJapan2019Trip(trip: Trip) {
  if (trip.id === JAPAN_2019_TRIP_ID) return true
  return trip.startDate === "2019-09-28" && trip.title.includes("日本")
}

function japan2019TripCurrent(trip: Trip) {
  const ids = trip.stops.map((stop) => stop.cityId)
  const notes = trip.stops.map((stop) => stop.note ?? "").join("\n")
  return (
    trip.title === JAPAN_2019_TITLE &&
    trip.startDate === "2019-09-28" &&
    trip.endDate === "2019-10-05" &&
    ids.join(",") === "jp-tokyo,jp-tokyo-disney,jp-osaka,jp-kobe,jp-osaka" &&
    notes.includes("晴空塔") &&
    notes.includes("石田屋") &&
    notes.includes("關西空港") &&
    trip.flights.length === 0 &&
    trip.stays.length === 0
  )
}

function ensureJapan2019Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameJapan2019Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !japan2019TripCurrent(current)) {
    const canInsert = !current && localStorage.getItem(JAPAN_2019_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createJapan2019Trip()
      if (created) {
        const merged: Trip = current
          ? {
              ...created,
              id: current.id,
              photos: current.photos,
              createdAt: current.createdAt,
            }
          : created
        existing = [merged, ...existing.filter((trip) => !sameJapan2019Trip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(JAPAN_2019_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(JAPAN_2019_FOCUS_FLAG, "1")
  }
}

function sameTokyoMayTrip(trip: Trip) {
  if (trip.id === TOKYO_MAY_TRIP_ID) return true
  if (trip.title.includes("五月東京")) return true
  return trip.startDate === "2024-05-18" && trip.stops.some((stop) => stop.cityId === "jp-tokyo-disney")
}

function tokyoMayTripCurrent(trip: Trip) {
  const ids = trip.stops.map((stop) => stop.cityId)
  const stays = trip.stays.map((stay) => stay.name).join(" ")
  return (
    ids[0] === "jp-tokyo" &&
    ids.includes("jp-tokyo-disney") &&
    stays.includes("東美滿如家") &&
    trip.startDate === "2024-05-18" &&
    trip.endDate === "2024-05-22" &&
    trip.stops.some((stop) => stop.note?.includes("哈利波特"))
  )
}

function ensureTokyoMayTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameTokyoMayTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !tokyoMayTripCurrent(current)) {
    const canInsert = !current && localStorage.getItem(TOKYO_MAY_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createTokyoMayTrip()
      if (created) {
        const merged: Trip = current
          ? {
              ...created,
              id: current.id,
              photos: current.photos,
              createdAt: current.createdAt,
            }
          : created
        if (merged.title !== TOKYO_MAY_TITLE) merged.title = TOKYO_MAY_TITLE
        existing = [merged, ...existing.filter((trip) => !sameTokyoMayTrip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(TOKYO_MAY_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(TOKYO_MAY_FOCUS_FLAG, "1")
  }
}

function sameJapanDecemberTrip(trip: Trip) {
  if (trip.id === JAPAN_DEC_TRIP_ID) return true
  if (trip.title.includes("2024年12月") && trip.stops.some((stop) => stop.cityId === "jp-kawaguchiko")) return true
  return trip.startDate === "2024-12-14" && trip.stops.some((stop) => stop.cityId === "jp-kyoto")
}

function japanDecemberTripCurrent(trip: Trip) {
  const ids = new Set(trip.stops.map((stop) => stop.cityId))
  const stays = trip.stays.map((stay) => stay.name).join(" ")
  return (
    ids.has("jp-kyoto") &&
    ids.has("jp-tokyo-disney") &&
    ids.has("jp-kawaguchiko") &&
    stays.includes("京都大倉") &&
    stays.includes("迪士尼樂園飯店") &&
    stays.includes("大使") &&
    stays.includes("富士景觀") &&
    stays.includes("拉維斯塔") &&
    trip.startDate === "2024-12-14" &&
    trip.endDate === "2024-12-21"
  )
}

function ensureJapanDecemberTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameJapanDecemberTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current || !japanDecemberTripCurrent(current)) {
    const canInsert = !current && localStorage.getItem(JAPAN_DEC_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createJapanDecemberTrip()
      if (created) {
        const merged: Trip = current
          ? {
              ...created,
              id: current.id,
              photos: current.photos,
              createdAt: current.createdAt,
            }
          : created
        if (merged.title !== JAPAN_DEC_TITLE) merged.title = JAPAN_DEC_TITLE
        existing = [merged, ...existing.filter((trip) => !sameJapanDecemberTrip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(JAPAN_DEC_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(JAPAN_DEC_FOCUS_FLAG, "1")
  }
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

export async function applyPublishedFootprints(bundle: ExportBundle) {
  if (typeof localStorage === "undefined") return { applied: false, switched: false }
  ensureBooks()
  const trips = bundle.trips.filter(isTrip).map(normalizeTrip)
  if (trips.length === 0) return { applied: false, switched: false }
  const store = readBookStore()
  if (!store) return { applied: false, switched: false }

  let dirty = false
  if (!store.books.some((book) => book.id === PUBLISHED_BOOK_ID)) {
    store.books.unshift({ id: PUBLISHED_BOOK_ID, name: "公開足跡" })
    dirty = true
  }

  const revision = bundle.exportedAt || "published"
  const missing = localStorage.getItem(tripStorageKey(PUBLISHED_BOOK_ID)) === null
  const changed = localStorage.getItem(PUBLISHED_REVISION_KEY) !== revision
  if (changed || missing) {
    for (const photo of bundle.photos) {
      if (!photo.id || !photo.dataUrl?.startsWith("data:")) continue
      await savePhotoBlob(photo.id, dataUrlToBlob(photo.dataUrl))
    }
    localStorage.setItem(tripStorageKey(PUBLISHED_BOOK_ID), JSON.stringify(trips))
    localStorage.setItem(PUBLISHED_REVISION_KEY, revision)
    dirty = true
  }

  let switched = false
  if (createdBookThisPage) {
    store.activeId = PUBLISHED_BOOK_ID
    createdBookThisPage = false
    switched = true
    dirty = true
  }

  if (dirty) {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(store))
    invalidateStores()
  }
  return { applied: changed || missing, switched }
}

export async function importBundle(bundle: ExportBundle) {
  const trips = bundle.trips.filter(isTrip)
  for (const photo of bundle.photos) {
    if (!photo.id || !photo.dataUrl?.startsWith("data:")) continue
    await savePhotoBlob(photo.id, dataUrlToBlob(photo.dataUrl))
  }
  return trips
}
