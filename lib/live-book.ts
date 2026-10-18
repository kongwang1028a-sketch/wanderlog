import type { Trip } from "@/lib/types"

export const LIVE_BOOK_URL = "https://crudcrud.com/api/3d0a76aa01e14e9faff5b3a602b8fabe/footprints"
export const LIVE_BOOK_ID = "6ad39ceb28f90803e8ffbefa"

export type LiveDecision = "push" | "pull" | "none"

function iso(value: string | undefined) {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toISOString()
}

export function tripSignature(trips: Trip[]) {
  return JSON.stringify(
    trips.map((trip) => ({
      id: trip.id,
      title: trip.title,
      startDate: iso(trip.startDate),
      endDate: iso(trip.endDate),
      notes: trip.notes ?? "",
      withGroup: trip.withGroup === true,
      companions: trip.companions ?? [],
      createdAt: iso(trip.createdAt),
      stops: trip.stops.map((stop) => ({
        id: stop.id,
        cityId: stop.cityId ?? "",
        name: stop.name,
        country: stop.country,
        countryCode: stop.countryCode,
        lat: stop.lat,
        lng: stop.lng,
        date: iso(stop.date),
        note: stop.note ?? "",
      })),
      flights: (trip.flights ?? []).map((flight) => ({
        id: flight.id,
        aircraft: flight.aircraft,
        route: flight.route,
      })),
      stays: (trip.stays ?? []).map((stay) => ({
        id: stay.id,
        name: stay.name,
        stopId: stay.stopId ?? "",
      })),
      photos: trip.photos.map((photo) => ({
        id: photo.id,
        kind: photo.kind,
        caption: photo.caption,
        url: photo.url ?? "",
        stopId: photo.stopId ?? "",
        addedAt: iso(photo.addedAt),
      })),
    })),
  )
}

export function decideLiveSync(input: {
  localSignature: string
  staticSignature: string
  remoteSignature: string | null
  localEditedAt: number
  remoteEditedAt: number
}): LiveDecision {
  const { localSignature, staticSignature, remoteSignature, localEditedAt, remoteEditedAt } = input
  if (remoteSignature && remoteSignature === localSignature) return "none"

  const localChanged = localSignature !== staticSignature
  const remoteChanged = remoteSignature !== null && remoteSignature !== staticSignature
  const edited = localEditedAt > 0 ? localEditedAt : 0

  if (remoteSignature && remoteEditedAt > edited) {
    if (edited === 0 && localChanged && !remoteChanged) return "push"
    return "pull"
  }

  if (edited > remoteEditedAt && remoteSignature !== localSignature) return "push"
  if (edited === 0 && localChanged && !remoteChanged) return "push"
  return "none"
}
