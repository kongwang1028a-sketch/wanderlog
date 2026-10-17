import assert from "node:assert/strict"
import { createJapan2019FebTrip } from "./japan-2019-feb-trip"
import { createJapan2019Trip } from "./japan-2019-trip"

const trip = createJapan2019FebTrip()
assert.ok(trip)
assert.equal(trip.title, "2019年2月 東京")
assert.equal(trip.startDate, "2019-02-04")
assert.equal(trip.endDate, "2019-02-10")
assert.deepEqual(
  trip.stops.map((stop) => `${stop.date} ${stop.name}`),
  ["2019-02-04 東京", "2019-02-06 東京迪士尼", "2019-02-07 東京"],
)
assert.deepEqual(
  trip.flights.map((flight) => flight.aircraft),
  ["JW102", "JW101"],
)
assert.deepEqual(
  trip.stays.map((stay) => stay.name),
  ["アパホテル浅草橋駅北"],
)
const text = `${trip.notes}\n${trip.stops.map((stop) => stop.note).join("\n")}\n${trip.flights.map((flight) => flight.route).join("\n")}`
for (const phrase of [
  "梗梗",
  "JW102",
  "JW101",
  "香草航空",
  "03:15",
  "07:15",
  "10:00",
  "13:25",
  "浅草橋",
  "03-5833-9111",
  "鳥貴族",
  "302",
  "八重和服",
  "墨田水族館",
  "2050",
  "舞濱",
  "鋼彈",
  "大黃蜂",
  "章魚燒",
  "Sunshine",
  "Durarara",
  "明治神宮",
  "P5",
  "沒有寫座位號碼",
]) {
  assert.match(text, new RegExp(phrase))
}
assert.doesNotMatch(text, /JL\d|NH\d|BR\d|座位\d/)
const september = createJapan2019Trip()
assert.ok(september)
assert.notEqual(september.id, trip.id)
assert.notEqual(september.startDate, trip.startDate)
console.log("all passed")
