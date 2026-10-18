import { createFukuokaTrip } from "@/lib/fukuoka-trip"
import { createJapan2018Trip } from "@/lib/japan-2018-tokyo-trip"
import { createJapan2019Trip } from "@/lib/japan-2019-trip"
import { createJapanDecemberTrip } from "@/lib/japan-dec-trip"
import { createTokyo2016FebTrip } from "@/lib/tokyo-2016-feb-trip"
import { createYokohamaTrip } from "@/lib/yokohama-trip"
import type { Trip } from "@/lib/types"

export function privacySeeds() {
  return [
    createTokyo2016FebTrip(),
    createJapan2018Trip(),
    createJapan2019Trip(),
    createJapanDecemberTrip(),
    createFukuokaTrip(),
    createYokohamaTrip(),
  ].filter((trip): trip is Trip => trip !== null)
}

export function applyPrivacyToTrip(trip: Trip, seeds = privacySeeds()) {
  const seed = seeds.find((item) => item.id === trip.id)
  if (!seed) return trip
  const stopNotes = new Map(seed.stops.map((stop) => [stop.id, stop.note]))
  const flightRoutes = new Map(seed.flights.map((flight) => [flight.id, flight.route]))
  const sameStopCount = seed.stops.length === trip.stops.length
  const sameFlightCount = seed.flights.length === trip.flights.length
  return {
    ...trip,
    notes: seed.notes,
    stops: trip.stops.map((stop, index) => {
      if (stopNotes.has(stop.id)) return { ...stop, note: stopNotes.get(stop.id) }
      if (sameStopCount) return { ...stop, note: seed.stops[index]?.note }
      return stop
    }),
    flights: trip.flights.map((flight, index) => {
      if (flightRoutes.has(flight.id)) return { ...flight, route: flightRoutes.get(flight.id) ?? flight.route }
      if (sameFlightCount) return { ...flight, route: seed.flights[index]?.route ?? flight.route }
      return flight
    }),
  }
}
