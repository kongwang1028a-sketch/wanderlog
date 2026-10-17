import assert from "node:assert/strict"
import { createKansaiTrip } from "./kansai-trip"

const trip = createKansaiTrip()
assert.ok(trip)
assert.equal(trip.title, "2026年8月 關西")
assert.equal(trip.startDate, "2026-08-06")
assert.equal(trip.endDate, "2026-08-13")
assert.deepEqual(
  trip.stops.map((stop) => `${stop.date} ${stop.name}`),
  [
    "2026-08-06 大阪",
    "2026-08-07 京都",
    "2026-08-08 姬路",
    "2026-08-08 神戶",
    "2026-08-09 大阪",
    "2026-08-10 有馬溫泉",
    "2026-08-11 奈良",
    "2026-08-12 白川鄉",
    "2026-08-13 大阪",
  ],
)
assert.match(trip.stops[1]?.note ?? "", /清水寺/)
assert.match(trip.stops[1]?.note ?? "", /伏見稻荷/)
assert.match(trip.stops[4]?.note ?? "", /環球影城/)
assert.match(trip.stops[5]?.note ?? "", /懷石/)
assert.match(trip.stops[6]?.note ?? "", /中谷堂/)
assert.match(trip.stops[8]?.note ?? "", /晚上班機/)
console.log("all passed")
