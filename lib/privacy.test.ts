import assert from "node:assert/strict"
import { applyPrivacyToTrip } from "./privacy"
import { createJapan2019Trip } from "./japan-2019-trip"
import { createJapanDecemberTrip } from "./japan-dec-trip"
import { createYokohamaTrip } from "./yokohama-trip"
import type { Trip } from "./types"

const yokohama = createYokohamaTrip()
assert.ok(yokohama)
const renamed = applyPrivacyToTrip({ ...yokohama, title: "自訂標題", notes: "舊的備註" })
assert.equal(renamed.title, "自訂標題")
assert.equal(renamed.notes, yokohama.notes)
assert.match(renamed.notes, /阿閒/)

const december = createJapanDecemberTrip()
assert.ok(december)
const stale = applyPrivacyToTrip({
  ...december,
  notes: "舊的同行備註",
  stops: december.stops.map((stop) => ({ ...stop, note: "舊的住宿備註" })),
})
assert.equal(stale.notes, december.notes)
assert.deepEqual(
  stale.stops.map((stop) => stop.note),
  december.stops.map((stop) => stop.note),
)
assert.match(stale.notes, /姊/)
assert.match(stale.notes, /爸/)

const japan2019 = createJapan2019Trip()
assert.ok(japan2019)
const ledger = applyPrivacyToTrip({
  ...japan2019,
  notes: "舊帳",
  stops: japan2019.stops.map((stop) => ({ ...stop, note: "舊帳" })),
})
assert.equal(ledger.notes, japan2019.notes)
assert.match(ledger.stops.map((stop) => stop.note).join("\n"), /晴空塔/)
assert.match(ledger.stops.map((stop) => stop.note).join("\n"), /環球影城/)
assert.equal(ledger.title, japan2019.title)

const untouched = {
  id: "other-trip",
  title: "別的旅程",
  startDate: "2020-01-01",
  endDate: "2020-01-02",
  notes: "維持原樣",
  stops: [],
  flights: [],
  stays: [],
  photos: [],
  createdAt: "2020-01-01T00:00:00.000Z",
} satisfies Trip
assert.equal(applyPrivacyToTrip(untouched).notes, "維持原樣")
console.log("all passed")
