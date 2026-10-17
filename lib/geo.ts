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

export function placeKey(stop: Pick<Stop, "cityId" | "lat" | "lng">) {
  if (stop.cityId) return `city:${stop.cityId}`
  return `geo:${stop.lat.toFixed(2)},${stop.lng.toFixed(2)}`
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
