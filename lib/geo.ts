import {
  CITIES,
  COUNTRY_SPOTS,
  cityById,
  type City,
  type Spot,
} from "@/lib/cities"
import type { Pin, Stop, Trip } from "@/lib/types"

const CITY_RADIUS_M = 15_000
const MIN_RADIUS_PX = 5

export function cityRadiusMeters(lat: number, zoom: number) {
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom
  return Math.max(CITY_RADIUS_M, MIN_RADIUS_PX * metersPerPixel)
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function flagEmoji(code: string) {
  if (!/^[A-Za-z]{2}$/.test(code)) return "⚑"
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export function pinYearLines(visits: { date: string; startDate: string }[], zoom = 8) {
  const years = [
    ...new Set(
      visits
        .map((visit) => (visit.date || visit.startDate).slice(0, 4))
        .filter((year) => /^\d{4}$/.test(year)),
    ),
  ].sort()
  if (years.length === 0) return ["⚑"]
  if (zoom < 5) return [years[years.length - 1].slice(2)]
  if (years.length === 1) return [years[0]]
  return years.map((year) => year.slice(2))
}

export function placeKey(stop: Pick<Stop, "cityId" | "lat" | "lng">) {
  if (stop.cityId) return `city:${stop.cityId}`
  return `geo:${stop.lat.toFixed(2)},${stop.lng.toFixed(2)}`
}

const LANDMARKS = [
  "三鷹吉卜力美術館",
  "華納兄弟哈利波特影城",
  "任天堂東京旗艦店",
  "東京站一番街",
  "澀谷寶可夢中心",
  "日本橋寶可夢中心",
  "品川水族館",
  "寶可夢咖啡",
  "環球影城",
  "晴空塔",
  "神田明神",
  "明治神宮",
  "淺草寺",
  "阿美橫丁",
  "壽々喜園",
  "白貓餐廳",
  "海之中道",
  "太宰府",
  "伏見稻荷",
  "清水寺",
  "姬路城",
  "北野異人館",
  "有馬溫泉",
  "東大寺",
  "白川鄉",
  "大涌谷",
  "冰川神社",
  "水族館",
  "一番街",
  "哈利波特",
  "迪士尼",
  "柚屋",
  "築地",
]

const AREAS = ["秋葉原", "新宿", "銀座", "日本橋", "池袋", "澀谷", "川越", "天神", "小倉", "港未來"]

const PLACE_NAMES = [...LANDMARKS, ...AREAS]
const AREA_NAMES = new Set(AREAS)
const PLACE_LIMIT = 4

function isTransitMention(note: string, start: number, end: number, name: string) {
  const prev = start > 0 ? note[start - 1] : ""
  const next = end < note.length ? note[end] : ""
  if (next === "線" || next === "站" || next === "搭") return true
  if (next === "地" && note.startsWith("地鐵", end)) return true
  if (name === "池袋" && (prev === "北" || prev === "區")) return true
  if (prev === "回" && AREA_NAMES.has(name)) return true
  return false
}

export function stopPlaceLine(note: string | undefined, fallback: string) {
  const named = LANDMARKS.filter((name) => fallback.includes(name)).sort((a, b) => b.length - a.length)[0]
  if (!note) return named ?? fallback
  const hits: { start: number; end: number; name: string }[] = []
  for (const name of PLACE_NAMES) {
    let from = 0
    while (from < note.length) {
      const start = note.indexOf(name, from)
      if (start < 0) break
      const end = start + name.length
      if (!isTransitMention(note, start, end, name)) hits.push({ start, end, name })
      from = end
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end)
  const kept: { start: number; end: number; name: string }[] = []
  for (const hit of hits) {
    if (kept.some((item) => hit.start < item.end && hit.end > item.start)) continue
    if (kept.some((item) => item.name === hit.name || item.name.includes(hit.name))) continue
    kept.push(hit)
  }
  const landmarks = kept.filter((hit) => !AREA_NAMES.has(hit.name))
  const areas = kept.filter((hit) => AREA_NAMES.has(hit.name))
  if (landmarks.length > 0) {
    return [...landmarks, ...areas].slice(0, PLACE_LIMIT).map((hit) => hit.name).join("、")
  }
  if (named) return named
  if (areas.length > 0) return areas.slice(0, PLACE_LIMIT).map((hit) => hit.name).join("、")
  return fallback
}

export function buildPins(trips: Trip[]): Pin[] {
  const pins = new Map<string, Pin>()
  for (const trip of trips) {
    for (const stop of trip.stops) {
      const key = placeKey(stop)
      const existing = pins.get(key)
      const visit = {
        tripId: trip.id,
        stopId: stop.id,
        title: trip.title,
        startDate: trip.startDate,
        date: stop.date ?? trip.startDate,
        places: stopPlaceLine(stop.note, stop.name),
      }
      if (existing) {
        existing.visits.push(visit)
        continue
      }
      pins.set(key, {
        key,
        lat: stop.lat,
        lng: stop.lng,
        name: stop.name,
        country: stop.country,
        countryCode: stop.countryCode,
        cityId: stop.cityId,
        visits: [visit],
      })
    }
  }
  return [...pins.values()]
}

export function uniqueCountries(trips: Trip[]) {
  const map = new Map<string, string>()
  for (const trip of trips) {
    for (const stop of trip.stops) map.set(stop.countryCode, stop.country)
  }
  return [...map.entries()].map(([code, name]) => ({ code, name }))
}

export function uniquePlaces(trips: Trip[]) {
  return buildPins(trips).length
}

export function searchCities(query: string) {
  const trimmed = query.trim()
  const lowered = trimmed.toLowerCase()
  if (!trimmed) return []
  return CITIES.map((item) => ({ item, score: scoreCity(item, trimmed, lowered) }))
    .filter((entry) => entry.score < 9)
    .sort((a, b) => a.score - b.score || a.item.zh.localeCompare(b.item.zh, "zh-Hant"))
    .slice(0, 8)
    .map((entry) => entry.item)
}

function scoreCity(item: City, query: string, lowered: string) {
  const en = item.en.toLowerCase()
  const aliases = item.aliases?.map((alias) => alias.toLowerCase()) ?? []
  if (item.zh.startsWith(query)) return 0
  if (en.startsWith(lowered)) return 1
  if (aliases.some((alias) => alias.startsWith(lowered))) return 1
  if (item.zh.includes(query)) return 2
  if (en.includes(lowered)) return 3
  if (aliases.some((alias) => alias.includes(lowered))) return 3
  if (item.country.includes(query)) return 4
  return 9
}

export function nearestCity(lat: number, lng: number, maxKm = 45) {
  let best: City | null = null
  let bestDistance = maxKm
  for (const item of CITIES) {
    const distance = haversineKm(lat, lng, item.lat, item.lng)
    if (distance < bestDistance) {
      bestDistance = distance
      best = item
    }
  }
  return best
}

export function routeDistanceKm(stops: Pick<Stop, "lat" | "lng">[]) {
  let total = 0
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1]
    const current = stops[index]
    if (!previous || !current) continue
    total += haversineKm(previous.lat, previous.lng, current.lat, current.lng)
  }
  return Math.round(total)
}

export function resolveSpots(stop: Pick<Stop, "cityId" | "lat" | "lng" | "countryCode">): {
  spots: Spot[]
  source: "city" | "nearby" | "country" | "none"
  placeLabel: string
} {
  if (stop.cityId) {
    const city = cityById(stop.cityId)
    if (city && city.spots.length > 0) {
      return { spots: city.spots, source: "city", placeLabel: city.zh }
    }
  }
  const nearby = nearestCity(stop.lat, stop.lng, 40)
  if (nearby && nearby.spots.length > 0) {
    return { spots: nearby.spots, source: "nearby", placeLabel: nearby.zh }
  }
  const countrySpots = COUNTRY_SPOTS[stop.countryCode.toUpperCase()]
  if (countrySpots && countrySpots.length > 0) {
    return { spots: countrySpots, source: "country", placeLabel: "" }
  }
  return { spots: [], source: "none", placeLabel: "" }
}

export function stopFromCity(city: City, date?: string, note?: string): Stop {
  return {
    id: crypto.randomUUID(),
    cityId: city.id,
    name: city.zh,
    country: city.country,
    countryCode: city.code,
    lat: city.lat,
    lng: city.lng,
    date,
    note,
  }
}
