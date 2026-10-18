import assert from "node:assert/strict"
import { createGermany2017Trip, createJapanJun2023Trip, createRussia2018Trip } from "./outline-trips"

const japan = createJapanJun2023Trip()
assert.equal(japan.title, "2023年6月 大阪 (4天3夜)")
assert.equal(japan.startDate, "2023-06-02")
assert.equal(japan.endDate, "2023-06-05")
assert.deepEqual(
  japan.stops.map((stop) => stop.name),
  ["大阪", "大阪", "大阪", "大阪"],
)
assert.equal(japan.stops[0]?.cityId, "jp-osaka")
assert.deepEqual(japan.companions, ["梗梗", "丹丹", "小咩(ㄒㄒ)"])
assert.equal(japan.withGroup, false)
assert.deepEqual(
  japan.flights.map((flight) => `${flight.aircraft} ${flight.route}`),
  ["去程 6/2 6:30–10:10 到大阪", "回程 6/5 18:30–20:30 到台灣"],
)
assert.deepEqual(
  japan.stays.map((stay) => stay.name),
  ["MIMARU 難波 STATION"],
)
assert.match(japan.stops[0]?.note ?? "", /大阪天守閣/)
assert.match(japan.stops[0]?.note ?? "", /18:00 力丸道頓堀吃到飽燒烤/)
assert.match(japan.stops[1]?.note ?? "", /海遊館/)
assert.match(japan.stops[1]?.note ?? "", /天保山市場街、難波美食小巷/)
assert.match(japan.stops[1]?.note ?? "", /梅田/)
assert.match(japan.stops[2]?.note ?? "", /環球影城/)
assert.match(japan.stops[2]?.note ?? "", /9:00–21:00/)
assert.match(japan.stops[2]?.note ?? "", /晚餐園區隨便吃（\?）/)
assert.match(japan.stops[3]?.note ?? "", /難波八阪神社/)
assert.match(japan.stops[3]?.note ?? "", /18:30–20:30 飛機回台灣/)
assert.doesNotMatch(japan.notes, /詳細行程還沒找到/)
assert.doesNotMatch(`${japan.notes} ${japan.stops.map((stop) => stop.note).join(" ")}`, /JL|BR|JX/)

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
assert.doesNotMatch(japan.notes, /東京|京都/)

const russia = createRussia2018Trip()
assert.equal(russia.title, "2018年 俄羅斯")
assert.equal(russia.startDate, "2018-01-01")
assert.equal(russia.endDate, "2018-12-31")
assert.equal(russia.stops[0]?.name, "俄羅斯")
assert.equal(russia.stops[0]?.countryCode, "RU")
assert.equal(russia.stops[0]?.date, undefined)
assert.equal(russia.stops[0]?.cityId, undefined)
assert.equal(russia.flights.length, 0)
assert.equal(russia.stays.length, 0)
assert.match(russia.notes, /2018/)
assert.match(russia.notes, /詳細行程還沒找到/)
assert.doesNotMatch(russia.notes, /莫斯科|聖彼得堡/)

console.log("all passed")
