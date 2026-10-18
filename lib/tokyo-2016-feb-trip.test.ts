import assert from "node:assert/strict"
import { createTokyo2016FebTrip } from "./tokyo-2016-feb-trip"

const trip = createTokyo2016FebTrip()
assert.ok(trip)
assert.equal(trip.title, "2016年2月 東京")
assert.equal(trip.startDate, "2016-02-29")
assert.equal(trip.endDate, "2016-03-04")
assert.deepEqual(
  trip.stops.map((stop) => `${stop.date} ${stop.name}`),
  ["2016-02-29 東京", "2016-03-01 東京迪士尼", "2016-03-02 東京"],
)
assert.deepEqual(
  trip.flights.map((flight) => flight.aircraft),
  ["JL802", "JL809"],
)
assert.deepEqual(
  trip.stays.map((stay) => stay.name),
  ["Super Hotel 秋葉原末広町"],
)
const text = `${trip.notes}\n${trip.stops.map((stop) => stop.note).join("\n")}\n${trip.flights.map((flight) => `${flight.aircraft} ${flight.route}`).join("\n")}`
for (const phrase of [
  "實際是 2016",
  "丹丹吃漢堡",
  "ㄆㄆ",
  "阿閒",
  "梗梗",
  "24000",
  "2050",
  "417",
  "JL802",
  "JL809",
  "波音 767",
  "晴空塔",
  "2060",
  "舞濱",
  "吉卜力",
  "8696****13",
  "1081****11",
  "壽々喜園",
  "790",
  "築地",
  "03-6848-9000",
]) {
  assert.match(text, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}
assert.doesNotMatch(text, /09\*{5}113|代墊|刷卡|\d{8,}/)
console.log("all passed")
