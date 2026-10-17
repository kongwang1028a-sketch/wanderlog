import assert from "node:assert/strict"
import { createGermany2017Trip, createJapanJun2023Trip } from "./outline-trips"

const japan = createJapanJun2023Trip()
assert.equal(japan.title, "2023年6月 日本")
assert.equal(japan.startDate, "2023-06-02")
assert.equal(japan.endDate, "2023-06-05")
assert.deepEqual(
  japan.stops.map((stop) => stop.name),
  ["日本"],
)
assert.equal(japan.stops[0]?.cityId, undefined)
assert.equal(japan.flights.length, 0)
assert.equal(japan.stays.length, 0)
assert.match(japan.notes, /詳細行程還沒找到/)
assert.match(japan.notes, /6月2日至5日/)

const germany = createGermany2017Trip()
assert.equal(germany.title, "2017年 德國")
assert.equal(germany.startDate, "2017-01-01")
assert.equal(germany.endDate, "2017-12-31")
assert.equal(germany.stops[0]?.name, "德國")
assert.equal(germany.stops[0]?.countryCode, "DE")
assert.equal(germany.stops[0]?.date, undefined)
assert.equal(germany.stops[0]?.cityId, undefined)
assert.equal(germany.flights.length, 0)
assert.equal(germany.stays.length, 0)
assert.match(germany.notes, /2017/)
assert.doesNotMatch(germany.notes, /柏林|慕尼黑|法蘭克福/)
assert.doesNotMatch(japan.notes, /東京|大阪|京都/)

console.log("all passed")
