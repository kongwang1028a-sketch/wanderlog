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
  RUSSIA_2018_TITLE,
  RUSSIA_2018_TRIP_ID,
  createGermany2017Trip,
  createJapanJun2023Trip,
  createRussia2018Trip,
} from "@/lib/outline-trips"
import { JAPAN_2018_TITLE, JAPAN_2018_TRIP_ID, createJapan2018Trip } from "@/lib/japan-2018-tokyo-trip"
import { JAPAN_2019_TITLE, JAPAN_2019_TRIP_ID, createJapan2019Trip } from "@/lib/japan-2019-trip"
import {
  AUSTRIA_CZECH_2010_TITLE,
  AUSTRIA_CZECH_2010_TRIP_ID,
  createAustriaCzech2010Trip,
} from "@/lib/austria-czech-2010-trip"
import { HAKONE_2011_TITLE, HAKONE_2011_TRIP_ID, createHakone2011Trip } from "@/lib/hakone-2011-trip"
import { TOKYO_2016_FEB_TITLE, TOKYO_2016_FEB_TRIP_ID, createTokyo2016FebTrip } from "@/lib/tokyo-2016-feb-trip"
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
const RUSSIA_2018_FOCUS_FLAG = "travel-footprints-russia-2018-focused"
const JAPAN_2018_FOCUS_FLAG = "travel-footprints-japan-2018-focused"
const JAPAN_2018_TOKYO_FOCUS_FLAG = "travel-footprints-japan-2018-tokyo-focused"
const AUSTRIA_CZECH_2010_FOCUS_FLAG = "travel-footprints-austria-czech-2010-focused"
const HAKONE_2011_FOCUS_FLAG = "travel-footprints-hakone-2011-focused"
const TOKYO_2016_FEB_FOCUS_FLAG = "travel-footprints-tokyo-2016-feb-focused"
const TITLE_FORMAT_FLAG = "travel-footprints-title-format-v1"
const STANDARD_TITLES: Record<string, string> = {
  [AURORA_TRIP_ID]: AURORA_TITLE,
  [YOKOHAMA_TRIP_ID]: YOKOHAMA_TITLE,
  [FUKUOKA_TRIP_ID]: FUKUOKA_TITLE,
  [KANSAI_TRIP_ID]: KANSAI_TITLE,
  [TOKYO_MAY_TRIP_ID]: TOKYO_MAY_TITLE,
  [JAPAN_DEC_TRIP_ID]: JAPAN_DEC_TITLE,
  [JAPAN_JUN_2023_TRIP_ID]: JAPAN_JUN_2023_TITLE,
  [GERMANY_2017_TRIP_ID]: GERMANY_2017_TITLE,
  [JAPAN_2019_TRIP_ID]: JAPAN_2019_TITLE,
  [RUSSIA_2018_TRIP_ID]: RUSSIA_2018_TITLE,
  [JAPAN_2018_TRIP_ID]: JAPAN_2018_TITLE,
  [AUSTRIA_CZECH_2010_TRIP_ID]: AUSTRIA_CZECH_2010_TITLE,
  [HAKONE_2011_TRIP_ID]: HAKONE_2011_TITLE,
  [TOKYO_2016_FEB_TRIP_ID]: TOKYO_2016_FEB_TITLE,
}

let pendingAuroraFocus: string | null = null
let createdBookThisPage = false

export const PUBLISHED_BOOK_ID = "published-footprints"
const PUBLISHED_REVISION_KEY = "travel-footprints-published-at"
export const LIVE_EDITED_AT_KEY = "travel-footprints-live-edited-at"

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
  ensureRussia2018Trip()
  ensureJapan2018Trip()
  dropUnownedJapan2019FebTrip()
  ensureAustriaCzech2010Trip()
  ensureHakone2011Trip()
  ensureTokyo2016FebTrip()
  applyStandardTitlesOnce()
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

function ensureAuroraTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameAuroraTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(AURORA_SEED_KEY) !== "1"
    if (current || canInsert) {
      const created = createAuroraTrip()
      if (created) {
        const merged = created
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

function ensureYokohamaTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameYokohamaTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(YOKOHAMA_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createYokohamaTrip()
      if (created) {
        const merged = created
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

function ensureFukuokaTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameFukuokaTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(FUKUOKA_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createFukuokaTrip()
      if (created) {
        const merged = created
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
  if (!current) {
    const canInsert = !current && localStorage.getItem(KANSAI_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createKansaiTrip()
      if (created) {
        const merged = created
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

function ensureJapanJun2023Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameJapanJun2023Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(JAPAN_JUN_2023_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createJapanJun2023Trip()
      const merged = created
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

function ensureGermany2017Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameGermany2017Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(GERMANY_2017_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createGermany2017Trip()
      const merged = created
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

function ensureJapan2019Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameJapan2019Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(JAPAN_2019_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createJapan2019Trip()
      if (created) {
        const merged = created
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

function sameRussia2018Trip(trip: Trip) {
  if (trip.id === RUSSIA_2018_TRIP_ID) return true
  return trip.title.includes("2018") && trip.title.includes("俄羅斯")
}

function ensureRussia2018Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameRussia2018Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(RUSSIA_2018_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createRussia2018Trip()
      const merged = created
      existing = [merged, ...existing.filter((trip) => !sameRussia2018Trip(trip))]
      writeTrips(existing)
      current = merged
    }
  }
  if (current && localStorage.getItem(RUSSIA_2018_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(RUSSIA_2018_FOCUS_FLAG, "1")
  }
}

function sameJapan2018Trip(trip: Trip) {
  if (trip.id === JAPAN_2018_TRIP_ID) return true
  return trip.title.includes("2018") && trip.stops.length === 1 && trip.stops[0]?.name === "日本"
}

function ensureJapan2018Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameJapan2018Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert =
      !current &&
      localStorage.getItem(JAPAN_2018_FOCUS_FLAG) !== "1" &&
      localStorage.getItem(JAPAN_2018_TOKYO_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createJapan2018Trip()
      if (created) {
        const merged = created
        existing = [merged, ...existing.filter((trip) => !sameJapan2018Trip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(JAPAN_2018_TOKYO_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(JAPAN_2018_FOCUS_FLAG, "1")
    localStorage.setItem(JAPAN_2018_TOKYO_FOCUS_FLAG, "1")
  }
}

function sameAustriaCzech2010Trip(trip: Trip) {
  if (trip.id === AUSTRIA_CZECH_2010_TRIP_ID) return true
  return trip.title === AUSTRIA_CZECH_2010_TITLE && trip.startDate === "2010-07-31"
}

function ensureAustriaCzech2010Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameAustriaCzech2010Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(AUSTRIA_CZECH_2010_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createAustriaCzech2010Trip()
      if (created) {
        const merged = created
        existing = [merged, ...existing.filter((trip) => !sameAustriaCzech2010Trip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(AUSTRIA_CZECH_2010_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(AUSTRIA_CZECH_2010_FOCUS_FLAG, "1")
  }
}

function sameHakone2011Trip(trip: Trip) {
  if (trip.id === HAKONE_2011_TRIP_ID) return true
  return trip.title === HAKONE_2011_TITLE && trip.startDate === "2011-01-26"
}

function ensureHakone2011Trip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameHakone2011Trip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(HAKONE_2011_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createHakone2011Trip()
      if (created) {
        const merged = created
        existing = [merged, ...existing.filter((trip) => !sameHakone2011Trip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(HAKONE_2011_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(HAKONE_2011_FOCUS_FLAG, "1")
  }
}

function sameTokyo2016FebTrip(trip: Trip) {
  if (trip.id === TOKYO_2016_FEB_TRIP_ID) return true
  return trip.title === TOKYO_2016_FEB_TITLE && trip.startDate === "2016-02-29"
}

function ensureTokyo2016FebTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameTokyo2016FebTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(TOKYO_2016_FEB_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createTokyo2016FebTrip()
      if (created) {
        const merged = created
        existing = [merged, ...existing.filter((trip) => !sameTokyo2016FebTrip(trip))]
        writeTrips(existing)
        current = merged
      }
    }
  }
  if (current && localStorage.getItem(TOKYO_2016_FEB_FOCUS_FLAG) !== "1") {
    pendingAuroraFocus = current.id
    localStorage.setItem(TOKYO_2016_FEB_FOCUS_FLAG, "1")
  }
}

function applyStandardTitlesOnce() {
  if (typeof localStorage === "undefined") return
  if (localStorage.getItem(TITLE_FORMAT_FLAG) === "1") return
  const keys = new Set<string>([LEGACY_TRIP_KEY])
  for (const book of readBookStore()?.books ?? []) keys.add(tripStorageKey(book.id))
  let changedActive = false
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) continue
      const trips = parsed.filter(isTrip)
      let changed = false
      const next = trips.map((trip) => {
        const title = STANDARD_TITLES[trip.id]
        if (!title || trip.title === title) return trip
        changed = true
        return { ...trip, title }
      })
      if (!changed) continue
      localStorage.setItem(key, JSON.stringify(next))
      if (key === currentTripKey()) changedActive = true
    } catch {
      continue
    }
  }
  localStorage.setItem(TITLE_FORMAT_FLAG, "1")
  if (changedActive) {
    cachedKey = ""
    cachedRaw = null
  }
}

function isUnownedJapan2019FebTrip(trip: Trip) {
  return trip.id === "japan-2019-feb" || (trip.title === "2019年2月 東京" && trip.startDate === "2019-02-04")
}

function dropUnownedJapan2019FebTrip() {
  if (typeof localStorage === "undefined") return
  const keys = new Set<string>([LEGACY_TRIP_KEY])
  for (const book of readBookStore()?.books ?? []) keys.add(tripStorageKey(book.id))
  let changedActive = false
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) continue
      const trips = parsed.filter(isTrip)
      if (!trips.some(isUnownedJapan2019FebTrip)) continue
      localStorage.setItem(key, JSON.stringify(trips.filter((trip) => !isUnownedJapan2019FebTrip(trip))))
      if (key === currentTripKey()) changedActive = true
    } catch {
      continue
    }
  }
  if (changedActive) {
    cachedKey = ""
    cachedRaw = null
  }
}

function sameTokyoMayTrip(trip: Trip) {
  if (trip.id === TOKYO_MAY_TRIP_ID) return true
  if (trip.title.includes("五月東京")) return true
  return trip.startDate === "2024-05-18" && trip.stops.some((stop) => stop.cityId === "jp-tokyo-disney")
}

function ensureTokyoMayTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameTokyoMayTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(TOKYO_MAY_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createTokyoMayTrip()
      if (created) {
        const merged = created
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

function ensureJapanDecemberTrip() {
  if (typeof localStorage === "undefined") return
  let existing = getTripSnapshot().trips
  const index = existing.findIndex(sameJapanDecemberTrip)
  let current = index >= 0 ? existing[index] : undefined
  if (!current) {
    const canInsert = !current && localStorage.getItem(JAPAN_DEC_FOCUS_FLAG) !== "1"
    if (current || canInsert) {
      const created = createJapanDecemberTrip()
      if (created) {
        const merged = created
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

export function readPublishedTrips() {
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(tripStorageKey(PUBLISHED_BOOK_ID))
  if (raw === null) return null
  return parseTrips(raw)
}

export function readLiveEditedAt() {
  if (typeof localStorage === "undefined") return 0
  const raw = localStorage.getItem(LIVE_EDITED_AT_KEY)
  const parsed = raw ? Date.parse(raw) : Number.NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

export function rememberLiveRevision(revision: string) {
  if (typeof localStorage === "undefined" || !revision) return
  localStorage.setItem(PUBLISHED_REVISION_KEY, revision)
  localStorage.setItem(LIVE_EDITED_AT_KEY, revision)
}

export function isPublishedBookActive() {
  return readBookStore()?.activeId === PUBLISHED_BOOK_ID
}

export function writePublishedTrips(trips: Trip[], revision: string) {
  if (typeof localStorage === "undefined") return
  ensureBooks()
  const store = readBookStore()
  if (!store) return
  if (!store.books.some((book) => book.id === PUBLISHED_BOOK_ID)) {
    store.books.unshift({ id: PUBLISHED_BOOK_ID, name: "公開足跡" })
    localStorage.setItem(BOOKS_KEY, JSON.stringify(store))
  }
  localStorage.setItem(tripStorageKey(PUBLISHED_BOOK_ID), JSON.stringify(trips))
  rememberLiveRevision(revision)
  invalidateStores()
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
  const storedRevision = localStorage.getItem(PUBLISHED_REVISION_KEY)
  const incomingAt = Date.parse(revision)
  const storedAt = storedRevision ? Date.parse(storedRevision) : Number.NaN
  const newer =
    storedRevision === null ||
    Number.isNaN(storedAt) ||
    (!Number.isNaN(incomingAt) && incomingAt > storedAt)
  const shouldWrite = missing || newer
  if (shouldWrite) {
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
  return { applied: shouldWrite, switched }
}

export async function importBundle(bundle: ExportBundle) {
  const trips = bundle.trips.filter(isTrip)
  for (const photo of bundle.photos) {
    if (!photo.id || !photo.dataUrl?.startsWith("data:")) continue
    await savePhotoBlob(photo.id, dataUrlToBlob(photo.dataUrl))
  }
  return trips
}
