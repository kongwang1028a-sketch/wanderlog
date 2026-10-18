import assert from "node:assert/strict"
import { createJapan2019Trip } from "./japan-2019-trip"

const trip = createJapan2019Trip()
assert.ok(trip)
assert.equal(trip.title, "2019年9月 東京大阪神戶")
assert.equal(trip.startDate, "2019-09-28")
assert.equal(trip.endDate, "2019-10-05")
assert.deepEqual(
  trip.stops.map((stop) => `${stop.date} ${stop.name}`),
  ["2019-09-28 東京", "2019-09-30 東京迪士尼", "2019-10-01 大阪", "2019-10-04 神戶", "2019-10-04 大阪"],
)
assert.equal(trip.flights.length, 0)
assert.equal(trip.stays.length, 0)
const text = `${trip.notes}\n${trip.stops.map((stop) => stop.note).join("\n")}`
for (const phrase of ["待待", "梗梗", "晴空塔", "水族館", "寶可夢咖啡", "石田屋", "環球影城", "關西空港"]) {
  assert.match(text, new RegExp(phrase))
}
assert.match(text, /沒有飯店名稱/)
assert.match(text, /沒有航班編號/)
assert.doesNotMatch(text, /BR\d|JL\d|大倉|東急|Blossom/)
assert.doesNotMatch(text, /代購|代墊|阿里山|帳上寫/)
assert.doesNotMatch(text, /\d{3,}\/3/)
console.log("all passed")
