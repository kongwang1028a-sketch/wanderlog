import assert from "node:assert/strict"
import { createYokohamaTrip } from "./yokohama-trip"

const trip = createYokohamaTrip()
assert.ok(trip)
assert.equal(trip.title, "橫濱、鎌倉")
assert.equal(trip.startDate, "2026-01-17")
assert.equal(trip.endDate, "2026-01-20")
assert.deepEqual(
  trip.stops.map((stop) => stop.name),
  ["橫濱", "鎌倉"],
)
assert.equal(trip.flights[0]?.aircraft, "JL96")
assert.match(trip.flights[0]?.route ?? "", /松山/)
assert.match(trip.flights[1]?.route ?? "", /羽田/)
assert.equal(trip.stays[0]?.name, "橫濱希爾頓酒店")
assert.equal(trip.stays[0]?.stopId, trip.stops[0]?.id)
assert.match(trip.notes, /玟璇/)
assert.match(trip.notes, /梗梗/)
console.log("ok 橫濱、鎌倉")
