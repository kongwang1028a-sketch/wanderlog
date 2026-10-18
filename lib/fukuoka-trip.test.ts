import assert from "node:assert/strict"
import { createFukuokaTrip } from "./fukuoka-trip"

const trip = createFukuokaTrip()
assert.ok(trip)
assert.equal(trip.title, "2025年10月 福岡北九州 (4天3夜)")
assert.equal(trip.startDate, "2025-10-23")
assert.equal(trip.endDate, "2025-10-26")
assert.deepEqual(
  trip.stops.map((stop) => stop.name),
  ["福岡", "北九州", "福岡"],
)
assert.match(trip.stops[1]?.note ?? "", /皿倉山/)
assert.match(trip.stops[2]?.note ?? "", /太宰府天滿宮/)
assert.equal(trip.flights[0]?.aircraft, "BR106")
assert.match(trip.flights[0]?.route ?? "", /桃園/)
assert.equal(trip.flights[1]?.aircraft, "JX841")
assert.match(trip.flights[1]?.route ?? "", /福岡/)
assert.equal(trip.stays[0]?.name, "博多中央JR九州Blossom酒店")
assert.equal(trip.stays[0]?.stopId, trip.stops[0]?.id)
assert.equal(trip.stays[1]?.name, "博多東急REI飯店")
assert.equal(trip.stays[1]?.stopId, trip.stops[2]?.id)
assert.match(trip.notes, /EC\*\*RS/)
assert.match(trip.notes, /EC\*\*9J/)
assert.match(trip.flights[0]?.route ?? "", /EC\*\*RS/)
assert.match(trip.flights[1]?.route ?? "", /EC\*\*9J/)
assert.doesNotMatch(`${trip.notes}\n${trip.flights.map((flight) => flight.route).join("\n")}`, /EC[A-Z0-9]{4}/)
console.log("all passed")
