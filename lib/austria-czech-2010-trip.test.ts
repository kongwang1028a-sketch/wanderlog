import assert from "node:assert/strict"
import { createAustriaCzech2010Trip } from "./austria-czech-2010-trip"

const trip = createAustriaCzech2010Trip()
assert.ok(trip)
assert.equal(trip.title, "2010年 奧地利、捷克")
assert.equal(trip.startDate, "2010-07-31")
assert.equal(trip.endDate, "2010-07-31")
assert.deepEqual(
  trip.stops.map((stop) => stop.name),
  ["布拉格"],
)
assert.equal(trip.stops[0]?.cityId, "cz-prague")
assert.equal(trip.flights.length, 0)
assert.equal(trip.stays.length, 0)
assert.equal(trip.photos.length, 0)
const text = `${trip.notes}\n${trip.stops[0]?.note}`
assert.match(text, /只有一張照片/)
assert.match(text, /288_Original\.JPG/)
assert.match(text, /11:44/)
assert.match(text, /布拉格/)
assert.match(text, /奧地利沒有出現城市/)
assert.doesNotMatch(text, /維也納|薩爾斯堡|因斯布魯克|查理大橋/)
console.log("all passed")
