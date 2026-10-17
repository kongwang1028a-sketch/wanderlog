import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildPins, pinYearLines } from "./geo"
import type { Trip } from "./types"

assert.deepEqual(pinYearLines([{ date: "2011-01-26", startDate: "2011-01-26" }]), ["2011"])
assert.deepEqual(
  pinYearLines([
    { date: "2016-02-29", startDate: "2016-02-29" },
    { date: "2016-03-02", startDate: "2016-02-29" },
    { date: "2018-10-28", startDate: "2018-10-28" },
    { date: "2019-09-28", startDate: "2019-09-28" },
    { date: "2024-05-18", startDate: "2024-05-18" },
  ]),
  ["16", "18", "19", "24"],
)
assert.deepEqual(
  pinYearLines(
    [
      { date: "2016-08-06", startDate: "2016-08-06" },
      { date: "2019-10-01", startDate: "2019-09-28" },
    ],
    8,
  ),
  ["16", "19"],
)
assert.deepEqual(pinYearLines([{ date: "2024-05-18", startDate: "2024-05-18" }], 3), ["24"])

const bundle = JSON.parse(readFileSync(new URL("../public/data/footprints.json", import.meta.url), "utf8")) as {
  trips: Trip[]
}
const pins = buildPins(bundle.trips)
const tokyo = pins.find((pin) => pin.name === "東京")
const hakone = pins.find((pin) => pin.name === "箱根")
const prague = pins.find((pin) => pin.name === "布拉格")
assert.ok(tokyo && hakone && prague)
assert.deepEqual(pinYearLines(tokyo.visits, 8), ["16", "18", "19", "24"])
assert.deepEqual(pinYearLines(hakone.visits, 8), ["2011"])
assert.deepEqual(pinYearLines(prague.visits, 8), ["2010"])
for (const pin of pins) {
  const lines = pinYearLines(pin.visits, 8)
  assert.ok(lines.length > 0 && lines.length <= 6, pin.name)
  assert.equal(lines.some((line) => /^[A-Z]{2}$/.test(line)), false, pin.name)
}
console.log(pins.map((pin) => `${pin.name} ${pinYearLines(pin.visits, 8).join(" / ")}`).join("\n"))
console.log("all passed")
