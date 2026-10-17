import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildPins, stopPlaceLine } from "./geo"
import type { Trip } from "./types"

const bundle = JSON.parse(readFileSync(new URL("../public/data/footprints.json", import.meta.url), "utf8")) as {
  trips: Trip[]
}
const tokyo = buildPins(bundle.trips).find((pin) => pin.name === "東京")
assert.ok(tokyo)

const byStop = new Map(tokyo.visits.map((visit) => [visit.stopId, visit]))
const expected: Record<string, string> = {
  "tokyo-2016-feb-tokyo": "晴空塔、秋葉原",
  "tokyo-2016-feb-tokyo-return": "三鷹吉卜力美術館、白貓餐廳、淺草寺、壽々喜園",
  "japan-2018-tokyo": "神田明神、明治神宮、一番街、日本橋寶可夢中心",
  "japan-2018-tokyo-return": "品川水族館、新宿、池袋",
  "japan-2019-tokyo": "水族館、晴空塔、寶可夢咖啡",
  "5f671929-0c1e-4291-99c1-f85bdfc1fa25": "淺草寺、阿美橫丁、東京站一番街、澀谷寶可夢中心",
  "840f6b8e-9599-4e05-96b5-69cc7d5dc72d": "華納兄弟哈利波特影城、池袋",
}

for (const [stopId, places] of Object.entries(expected)) {
  const visit = byStop.get(stopId)
  assert.ok(visit, stopId)
  assert.equal(visit.places, places, stopId)
  console.log(`${visit.date} ${visit.title}｜${visit.places}`)
}

assert.equal(tokyo.visits.length, Object.keys(expected).length)
assert.equal(new Set(tokyo.visits.map((visit) => visit.places)).size, tokyo.visits.length)
assert.notEqual(byStop.get("tokyo-2016-feb-tokyo")?.date, byStop.get("tokyo-2016-feb-tokyo-return")?.date)
assert.equal(
  stopPlaceLine("約早上八點到桃園。接著晴空塔逛街，押上站。銀座線到秋葉原站。", "東京"),
  "晴空塔",
)
assert.equal(stopPlaceLine("Super Hotel 秋葉原末広町。接著晴空塔逛街。", "東京"), "晴空塔、秋葉原")
assert.equal(stopPlaceLine("14:00 北池袋 Buku。15:40 神田明神。", "東京"), "神田明神")
assert.equal(stopPlaceLine("詳細行程還沒找到。", "東京"), "東京")
assert.equal(
  stopPlaceLine("早餐前一天自備。7:00 出門。秋葉原搭京濱東北線蒲田行到東京，轉京葉線蘇我行到舞濱。", "東京迪士尼"),
  "迪士尼",
)
assert.equal(stopPlaceLine("7:45 池袋接駁車日幣1000。9:00 入園。", "東京迪士尼"), "迪士尼")

const disney = buildPins(bundle.trips).find((pin) => pin.name === "東京迪士尼")
assert.ok(disney)
for (const visit of disney.visits) {
  assert.equal(visit.places, "迪士尼", visit.stopId)
  console.log(`${visit.date} ${visit.title}｜${visit.places}`)
}

for (const pin of buildPins(bundle.trips)) {
  for (const visit of pin.visits) {
    const names = visit.places.split("、")
    assert.equal(new Set(names).size, names.length, `${pin.name} ${visit.stopId}`)
  }
}

console.log("all passed")
