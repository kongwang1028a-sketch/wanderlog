import type { City } from "@/lib/cities"
import { nearestCity } from "@/lib/geo"

export type TraceKind = "photo" | "visit" | "sample"

export type TracePoint = {
  lat: number
  lng: number
  time: number
  day: string
  endTime?: number
  endDay?: string
  label?: string
  hotel?: boolean
  kind: TraceKind
}

export type TraceStop = {
  city: City
  day?: string
}

export type TraceStay = {
  name: string
  cityId: string
}

export type TraceDraft = {
  title: string
  startDate: string
  endDate: string
  stops: TraceStop[]
  stays: TraceStay[]
}

export type ClusterResult = {
  trips: TraceDraft[]
  summary: string
  snapped: number
  missed: number
}

const SNAP_KM = 80
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const HOTEL_NAME =
  /hotel|hostel|resort|hyatt|hilton|marriott|sheraton|westin|飯店|酒店|旅館|旅店|民宿|ホテル|東橫|東急|\binn\b/i

export function isHotelLabel(name: string) {
  return HOTEL_NAME.test(name)
}

export function parseLocationText(raw: string): { points: TracePoint[]; format: string } {
  const text = raw.replace(/^\uFEFF/, "").trim()
  if (!text) return { points: [], format: "" }
  if (text.startsWith("<") || text.includes("<gpx") || text.includes("<kml")) {
    return { points: parseTrack(text), format: text.includes("<kml") ? "kml" : "gpx" }
  }
  try {
    const parsed: unknown = JSON.parse(text)
    const points: TracePoint[] = []
    collectJson(parsed, points)
    return { points, format: "json" }
  } catch {
    return { points: [], format: "" }
  }
}

export function clusterTracePoints(points: TracePoint[], source: "photos" | "timeline"): ClusterResult {
  const missed = points.filter((point) => !nearestCity(point.lat, point.lng, SNAP_KM)).length
  const dated = clusterGroup(points.filter((point) => point.day), source)
  const undated = clusterGroup(
    points.filter((point) => !point.day).map((point, index) => ({ ...point, time: index * HOUR })),
    "photos",
  ).map((trip) => ({ ...trip, startDate: "", endDate: "" }))
  const trips = [...dated, ...undated]
  return {
    trips,
    snapped: points.length - missed,
    missed,
    summary: summarize(trips, points.length, missed),
  }
}

export function sameTrace(
  draft: TraceDraft,
  existing: { startDate: string; stops: { cityId?: string }[] },
) {
  const draftIds = draft.stops.map((stop) => stop.city.id).join(",")
  const existingIds = existing.stops.map((stop) => stop.cityId ?? "").join(",")
  if (!draftIds || draftIds !== existingIds) return false
  return (draft.startDate || "") === (existing.startDate || "")
}

export function readExifDay(value: unknown) {
  if (typeof value !== "string") return ""
  const match = /^(\d{4}):(\d{2}):(\d{2})/.exec(value.trim())
  if (!match) return ""
  return `${match[1]}-${match[2]}-${match[3]}`
}

function collectJson(value: unknown, points: TracePoint[]) {
  if (!value || typeof value !== "object") return
  if (Array.isArray(value)) {
    if (value.length === 0) return
    const first = value[0]
    if (first && typeof first === "object") {
      const record = first as Record<string, unknown>
      if ("latitudeE7" in record || "timestampMs" in record || "timestamp" in record) {
        readSamples(value, points)
        return
      }
      if ("placeVisit" in record || "activitySegment" in record) {
        readTimeline(value, points)
        return
      }
      if ("visit" in record || "semanticSegment" in record || "timelinePath" in record || "startTime" in record) {
        readSegments(value, points)
        return
      }
    }
    for (const item of value) collectJson(item, points)
    return
  }
  const record = value as Record<string, unknown>
  if (Array.isArray(record.timelineObjects)) readTimeline(record.timelineObjects, points)
  if (Array.isArray(record.semanticSegments)) readSegments(record.semanticSegments, points)
  if (Array.isArray(record.locations)) readSamples(record.locations, points)
}

function readTimeline(objects: unknown[], points: TracePoint[]) {
  for (const item of objects) {
    if (!item || typeof item !== "object") continue
    const visit = (item as { placeVisit?: Record<string, unknown> }).placeVisit
    if (!visit) continue
    pushVisit(points, visit.location, visit.duration, undefined)
  }
}

function readSegments(segments: unknown[], points: TracePoint[]) {
  for (const item of segments) {
    if (!item || typeof item !== "object") continue
    const segment = item as Record<string, unknown>
    const visit = segment.visit
    if (!visit || typeof visit !== "object") continue
    const record = visit as Record<string, unknown>
    const candidate =
      record.topCandidate && typeof record.topCandidate === "object"
        ? (record.topCandidate as Record<string, unknown>)
        : record
    const place = candidate.placeLocation ?? record.placeLocation
    const semantic = typeof candidate.semanticType === "string" ? candidate.semanticType : ""
    pushVisit(points, place, undefined, {
      start: segment.startTime,
      end: segment.endTime,
      semantic,
      label: firstString(candidate.name, record.placeName, candidate.placeName),
    })
  }
}

function pushVisit(
  points: TracePoint[],
  location: unknown,
  duration: unknown,
  extra?: { start?: unknown; end?: unknown; semantic?: string; label?: string },
) {
  if (!location || typeof location !== "object") return
  const coords = readCoords(location as Record<string, unknown>)
  if (!coords) return
  const span = duration && typeof duration === "object" ? (duration as Record<string, unknown>) : undefined
  const start = readWhen(extra?.start ?? span?.startTimestamp ?? span?.startTimestampMs)
  const end = readWhen(extra?.end ?? span?.endTimestamp ?? span?.endTimestampMs)
  if (!start) return
  const record = location as Record<string, unknown>
  const label = extra?.label || (typeof record.name === "string" ? record.name : "")
  const hotel = extra?.semantic === "HOTEL" || extra?.semantic === "LODGING" || Boolean(label && isHotelLabel(label))
  points.push({
    lat: coords.lat,
    lng: coords.lng,
    time: start.time,
    day: start.day,
    endTime: end?.time,
    endDay: end?.day,
    label: label || undefined,
    hotel,
    kind: "visit",
  })
}

function readSamples(locations: unknown[], points: TracePoint[]) {
  const step = Math.max(1, Math.ceil(locations.length / 12000))
  for (let index = 0; index < locations.length; index += step) {
    const item = locations[index]
    if (!item || typeof item !== "object") continue
    const record = item as Record<string, unknown>
    const coords = readCoords(record)
    const when = readWhen(record.timestamp ?? record.timestampMs)
    if (!coords || !when) continue
    points.push({ lat: coords.lat, lng: coords.lng, time: when.time, day: when.day, kind: "sample" })
  }
}

function readCoords(record: Record<string, unknown>) {
  const lat = readAxis(record.latitudeE7 ?? record.latE7)
  const lng = readAxis(record.longitudeE7 ?? record.lngE7)
  if (lat != null && lng != null) return { lat, lng }
  if (typeof record.latLng === "string") return parseLatLng(record.latLng)
  return null
}

function readAxis(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : null
  if (number == null || !Number.isFinite(number)) return null
  const degrees = Math.abs(number) > 1000 ? number / 1e7 : number
  return Math.abs(degrees) <= 180 ? degrees : null
}

function parseLatLng(text: string) {
  const match = /(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*,\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i.exec(text)
  if (!match) return null
  let lat = Number(match[1])
  let lng = Number(match[3])
  if (match[2]?.toUpperCase() === "S") lat = -Math.abs(lat)
  if (match[4]?.toUpperCase() === "W") lng = -Math.abs(lng)
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function readWhen(value: unknown): { time: number; day: string } | null {
  if (typeof value === "number" && Number.isFinite(value)) return fromMs(value < 1e12 ? value * 1000 : value)
  if (typeof value !== "string" || !value) return null
  if (/^\d+$/.test(value)) return readWhen(Number(value))
  const prefix = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  const time = Date.parse(value)
  if (!prefix || Number.isNaN(time)) return null
  return { time, day: prefix[1] }
}

function fromMs(time: number) {
  if (!Number.isFinite(time)) return null
  return { time, day: new Date(time).toISOString().slice(0, 10) }
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function parseTrack(xml: string): TracePoint[] {
  const points: TracePoint[] = []
  const pattern = /<(?:trkpt|wpt)\b([^>]*)>([\s\S]*?)<\/(?:trkpt|wpt)>/gi
  let match = pattern.exec(xml)
  while (match) {
    const lat = Number(/lat="([^"]+)"/i.exec(match[1] ?? "")?.[1])
    const lng = Number(/lon="([^"]+)"/i.exec(match[1] ?? "")?.[1])
    const stamp = /<time>([^<]+)<\/time>/i.exec(match[2] ?? "")?.[1]
    const when = stamp ? readWhen(stamp.trim()) : null
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push({
        lat,
        lng,
        time: when?.time ?? 0,
        day: when?.day ?? "",
        kind: "sample",
      })
    }
    match = pattern.exec(xml)
  }
  if (points.length > 12000) {
    const step = Math.ceil(points.length / 12000)
    return points.filter((_, index) => index % step === 0)
  }
  return points
}

type Stay = {
  city: City
  startTime: number
  endTime: number
  startDay: string
  endDay: string
  hotels: string[]
  count: number
  kind: TraceKind
}

function clusterGroup(points: TracePoint[], source: "photos" | "timeline") {
  return splitTrips(buildStays(points, source), source)
}

function buildStays(points: TracePoint[], source: "photos" | "timeline") {
  const windowMs = source === "photos" ? 48 * HOUR : 36 * HOUR
  const snapped = points
    .flatMap((point) => {
      const city = nearestCity(point.lat, point.lng, SNAP_KM)
      return city ? [{ point, city }] : []
    })
    .sort((a, b) => a.point.time - b.point.time || a.point.day.localeCompare(b.point.day))

  const stays: Stay[] = []
  for (const { point, city } of snapped) {
    const endTime = point.endTime ?? point.time
    const last = stays[stays.length - 1]
    const gap = last ? point.time - last.endTime : Number.POSITIVE_INFINITY
    if (last && last.city.id === city.id && gap >= 0 && gap <= windowMs) {
      last.endTime = Math.max(last.endTime, endTime)
      last.endDay = point.endDay || point.day || last.endDay
      last.count += 1
      if (point.kind !== "photo") last.kind = point.kind
      rememberHotel(last, point)
      continue
    }
    const stay: Stay = {
      city,
      startTime: point.time,
      endTime,
      startDay: point.day,
      endDay: point.endDay || point.day,
      hotels: [],
      count: 1,
      kind: point.kind,
    }
    rememberHotel(stay, point)
    stays.push(stay)
  }
  return stays.filter((stay) => keepStay(stay))
}

function rememberHotel(stay: Stay, point: TracePoint) {
  if (!point.hotel || !point.label) return
  const name = point.label.replace(/\s+/g, " ").trim().slice(0, 40)
  if (!name || stay.hotels.includes(name)) return
  stay.hotels.push(name)
}

function keepStay(stay: Stay) {
  if (stay.kind === "photo" || stay.hotels.length > 0) return true
  const hours = (stay.endTime - stay.startTime) / HOUR
  if (stay.kind === "visit") return hours >= 1.5 || stay.endTime === stay.startTime
  return hours >= 3 || stay.count >= 4
}

function splitTrips(stays: Stay[], source: "photos" | "timeline") {
  const home = homeIds(stays, source)
  const away = stays.filter((stay) => !home.has(stay.city.id))
  const gapLimit = (source === "photos" ? 5 : 3) * DAY
  const groups: Stay[][] = []
  for (const stay of away) {
    const group = groups[groups.length - 1]
    const previous = group?.[group.length - 1]
    if (!group || !previous || stay.startTime - previous.endTime > gapLimit) groups.push([stay])
    else group.push(stay)
  }
  return groups.map(toDraft)
}

function homeIds(stays: Stay[], source: "photos" | "timeline") {
  const byCity = new Map<string, number>()
  for (const stay of stays) {
    const days = calendarDays(stay.startDay, stay.endDay)
    byCity.set(stay.city.id, (byCity.get(stay.city.id) ?? 0) + days)
  }
  if (byCity.size < 2) return new Set<string>()
  let top = ""
  let topDays = 0
  let total = 0
  for (const [id, days] of byCity) {
    total += days
    if (days > topDays) {
      top = id
      topDays = days
    }
  }
  const span = calendarDays(stays[0]?.startDay ?? "", stays[stays.length - 1]?.endDay ?? "")
  const minSpan = source === "photos" ? 120 : 40
  const minDays = source === "photos" ? 21 : 10
  const share = source === "photos" ? 0.5 : 0.35
  if (span < minSpan || topDays < minDays || total === 0 || topDays / total < share) return new Set<string>()
  return new Set([top])
}

function calendarDays(start: string, end: string) {
  if (!start || !end) return 1
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)
  if (!Number.isFinite(ms) || ms < 0) return 1
  return Math.floor(ms / DAY) + 1
}

function toDraft(group: Stay[]): TraceDraft {
  const stops: TraceStop[] = []
  const stays: TraceStay[] = []
  for (const stay of group) {
    const last = stops[stops.length - 1]
    if (!last || last.city.id !== stay.city.id) stops.push({ city: stay.city, day: stay.startDay || undefined })
    for (const name of stay.hotels) {
      if (!stays.some((item) => item.name === name && item.cityId === stay.city.id)) {
        stays.push({ name, cityId: stay.city.id })
      }
    }
  }
  const startDate = group[0]?.startDay ?? ""
  const endDate = group[group.length - 1]?.endDay || startDate
  return { title: titleFrom(stops), startDate, endDate, stops, stays }
}

function titleFrom(stops: TraceStop[]) {
  const names = stops.map((stop) => stop.city.zh)
  if (names.length <= 3) return names.join("、")
  return `${names.slice(0, 2).join("、")}等地`
}

function summarize(trips: TraceDraft[], total: number, missed: number) {
  if (total === 0) return "沒有讀到定位。"
  if (trips.length === 0) {
    return "這些位置大多落在同一個城市，或停留太短。日常所在地會先拿掉；短期旅行可以直接貼年份和城市。"
  }
  const names = trips
    .slice(0, 4)
    .map((trip) => trip.title)
    .join("、")
  let text = `讀出 ${trips.length} 趟：${names}`
  if (trips.length > 4) text += "…"
  if (missed > 0) text += `。另有 ${missed} 個位置對不到城市`
  return text
}
