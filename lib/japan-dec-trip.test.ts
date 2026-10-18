import assert from "node:assert/strict"
import { createJapanDecemberTrip } from "./japan-dec-trip"

const trip = createJapanDecemberTrip()
assert.ok(trip)
assert.equal(trip.title, "2024年12月 京都東京")
assert.equal(trip.startDate, "2024-12-14")
assert.equal(trip.endDate, "2024-12-21")
assert.deepEqual(
  trip.stops.map((stop) => `${stop.date} ${stop.name}`),
  ["2024-12-14 京都", "2024-12-17 東京迪士尼", "2024-12-19 河口湖"],
)
assert.match(trip.stops[0]?.note ?? "", /027-0007\*\*\*\*-01/)
assert.match(trip.stops[0]?.note ?? "", /027-0007\*\*\*\*-02/)
assert.match(trip.stops[1]?.note ?? "", /216\*\*\*198/)
assert.match(trip.stops[1]?.note ?? "", /216\*\*\*583/)
assert.match(trip.stops[2]?.note ?? "", /2207-\*\*\*\*-6340/)
assert.match(trip.stops[2]?.note ?? "", /2207-\*\*\*\*-8951/)
assert.match(trip.stops[2]?.note ?? "", /甲州牛/)
assert.match(trip.stops[2]?.note ?? "", /壽喜燒/)
assert.deepEqual(
  trip.stays.map((stay) => stay.name),
  ["京都大倉飯店", "東京迪士尼樂園飯店", "迪士尼大使飯店", "富士景觀飯店", "拉維斯塔富士河口湖"],
)
assert.match(trip.notes, /阿法/)
assert.match(trip.notes, /爸/)
assert.match(trip.notes, /媽/)
assert.doesNotMatch(trip.notes, /[A-Z]{4,}/)
assert.equal(trip.notes.includes("207945368"), false)
const hidden = `${trip.notes}\n${trip.stops.map((stop) => stop.note).join("\n")}`
assert.doesNotMatch(hidden, /\d{8,}/)
console.log("all passed")
