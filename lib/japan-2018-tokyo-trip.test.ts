import assert from "node:assert/strict"
import { createJapan2018Trip } from "./japan-2018-tokyo-trip"

const trip = createJapan2018Trip()
assert.ok(trip)
assert.equal(trip.title, "2018年10月 東京")
assert.equal(trip.startDate, "2018-10-28")
assert.equal(trip.endDate, "2018-11-02")
assert.deepEqual(
  trip.stops.map((stop) => `${stop.date} ${stop.name}`),
  ["2018-10-28 東京", "2018-10-31 東京迪士尼", "2018-11-01 川越", "2018-11-01 東京"],
)
assert.equal(trip.flights.length, 0)
assert.deepEqual(
  trip.stays.map((stay) => stay.name),
  ["Buku Tokyo 東京日租"],
)
const text = `${trip.notes}\n${trip.stops.map((stop) => stop.note).join("\n")}`
for (const phrase of [
  "76",
  "DADA",
  "梗梗",
  "我廢",
  "玟璇",
  "桃園 06:40",
  "10:35",
  "臺幣3008",
  "日幣8750",
  "神田明神",
  "NUBER SUGER",
  "日本橋寶可夢中心",
  "臺幣2020",
  "謝66",
  "柚屋",
  "品川水族館",
  "日幣1700",
  "臺幣3390",
  "臺幣11438",
  "日幣23959",
  "ふらんす亭",
  "日幣1080",
  "沒有航班編號",
]) {
  assert.match(text, new RegExp(phrase))
}
assert.doesNotMatch(text, /JL\d|NH\d|BR\d/)
assert.equal(trip.stops[2]?.cityId, "jp-kawagoe")
console.log("all passed")
