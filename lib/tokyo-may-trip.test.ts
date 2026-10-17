import assert from "node:assert/strict"
import { createTokyoMayTrip } from "./tokyo-may-trip"

const trip = createTokyoMayTrip()
assert.ok(trip)
assert.equal(trip.title, "2024年5月 東京")
assert.equal(trip.startDate, "2024-05-18")
assert.equal(trip.endDate, "2024-05-22")
assert.deepEqual(
  trip.stops.map((stop) => `${stop.date} ${stop.name}`),
  ["2024-05-18 東京", "2024-05-20 東京迪士尼", "2024-05-21 東京"],
)
assert.match(trip.stops[0]?.note ?? "", /淺草寺/)
assert.match(trip.stops[0]?.note ?? "", /任天堂/)
assert.match(trip.stops[1]?.note ?? "", /迪士尼樂園/)
assert.match(trip.stops[2]?.note ?? "", /哈利波特/)
assert.match(trip.stops[2]?.note ?? "", /池袋/)
assert.equal(trip.stays[0]?.name, "東京上野東美滿如家飯店")
assert.equal(trip.stays[0]?.stopId, trip.stops[0]?.id)
assert.match(trip.notes, /成田/)
assert.equal(trip.stops.some((stop) => stop.name === "奧蘭多"), false)
console.log("all passed")
