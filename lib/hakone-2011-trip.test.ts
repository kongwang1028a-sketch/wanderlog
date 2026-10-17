import assert from "node:assert/strict"
import { createHakone2011Trip } from "./hakone-2011-trip"

const trip = createHakone2011Trip()
assert.ok(trip)
assert.equal(trip.title, "2011年1月 箱根")
assert.equal(trip.startDate, "2011-01-26")
assert.equal(trip.endDate, "2011-01-26")
assert.equal(trip.stops[0]?.cityId, "jp-hakone")
assert.equal(trip.stops[0]?.name, "箱根")
assert.equal(trip.flights.length, 0)
assert.equal(trip.stays.length, 0)
assert.equal(trip.photos.length, 0)
const text = `${trip.notes}\n${trip.stops[0]?.note}`
assert.match(text, /只有一張照片/)
assert.match(text, /大涌谷/)
assert.match(text, /1044/)
assert.match(text, /SANY1209_Original\.JPG/)
assert.match(text, /11:13/)
assert.match(text, /沒有定位/)
assert.doesNotMatch(text, /蘆之湖|箱根神社|富士山/)
console.log("all passed")
