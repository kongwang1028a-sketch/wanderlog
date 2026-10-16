import assert from "node:assert/strict"
import { parseItinerary } from "./itinerary"

const today = new Date(2026, 9, 16)

function names(text: string) {
  return parseItinerary(text, today).stops.map((stop) => stop.city.zh)
}

function check(name: string, fn: () => void) {
  try {
    fn()
    console.log("ok", name)
  } catch (error) {
    console.error("FAIL", name)
    throw error
  }
}

check("關西自由行", () => {
  const parsed = parseItinerary(
    `關西自由行
2024/11/2-11/7
11/2 大阪 道頓堀
11/4-11/5 京都 清水寺、伏見稻荷
11/6 奈良
11/7 關西機場回台北`,
    today,
  )
  assert.equal(parsed.title, "關西自由行")
  assert.equal(parsed.startDate, "2024-11-02")
  assert.equal(parsed.endDate, "2024-11-07")
  assert.deepEqual(names(parsed.title ? `關西自由行
2024/11/2-11/7
11/2 大阪 道頓堀
11/4-11/5 京都 清水寺、伏見稻荷
11/6 奈良
11/7 關西機場回台北` : ""), ["大阪", "京都", "奈良"])
  assert.equal(parsed.stops[0]?.date, "2024-11-02")
  assert.equal(parsed.stops[0]?.note, "道頓堀")
  assert.equal(parsed.stops[1]?.date, "2024-11-04")
  assert.equal(parsed.stops[1]?.note, "清水寺、伏見稻荷")
  assert.equal(parsed.stops[2]?.date, "2024-11-06")
  assert.equal(parsed.stops[2]?.city.zh, "奈良")
  assert.match(parsed.summary, /11\/2–11\/7/)
  assert.match(parsed.summary, /大阪、京都、奈良/)
})

check("全形數字", () => {
  const parsed = parseItinerary("１１／２　大阪　道頓堀", today)
  assert.equal(parsed.stops[0]?.city.zh, "大阪")
  assert.equal(parsed.stops[0]?.date, "2026-11-02")
  assert.equal(parsed.stops[0]?.note, "道頓堀")
})

check("東京都不是京都", () => {
  const parsed = parseItinerary("3/1 東京都", today)
  assert.deepEqual(names("3/1 東京都"), ["東京"])
  assert.equal(parsed.stops[0]?.date, "2026-03-01")
})

check("跨年", () => {
  const parsed = parseItinerary(
    `北海道
12/30 札幌
1/2 函館`,
    today,
  )
  assert.equal(parsed.title, "北海道")
  assert.equal(parsed.stops[0]?.date, "2026-12-30")
  assert.equal(parsed.stops[1]?.city.zh, "函館")
  assert.equal(parsed.stops[1]?.date, "2027-01-02")
  assert.equal(parsed.endDate, "2027-01-02")
})

check("第N天", () => {
  const parsed = parseItinerary(
    `關西自由行
2024/11/2-11/7
第1天 大阪
第3天 京都 清水寺`,
    today,
  )
  assert.equal(parsed.stops[0]?.date, "2024-11-02")
  assert.equal(parsed.stops[1]?.city.zh, "京都")
  assert.equal(parsed.stops[1]?.date, "2024-11-04")
  assert.equal(parsed.stops[1]?.note, "清水寺")
})

check("英文城市", () => {
  const parsed = parseItinerary(
    `Italy
2023/5/11-5/20
5/11 Rome
5/14 Florence
5/17 Venice`,
    today,
  )
  assert.equal(parsed.title, "Italy")
  assert.deepEqual(
    parsed.stops.map((stop) => stop.city.en),
    ["Rome", "Florence", "Venice"],
  )
  assert.equal(parsed.startDate, "2023-05-11")
  assert.equal(parsed.endDate, "2023-05-20")
})

check("HK 邊界", () => {
  assert.deepEqual(names("3/1 HK"), ["香港"])
  assert.deepEqual(names("3/1 THK"), [])
  assert.deepEqual(names("check HK"), ["香港"])
})

check("連續同一城市合併", () => {
  const parsed = parseItinerary(
    `11/2 大阪 道頓堀
11/3 大阪 大阪城
11/4 京都`,
    today,
  )
  assert.deepEqual(
    parsed.stops.map((stop) => stop.city.zh),
    ["大阪", "京都"],
  )
  assert.equal(parsed.stops[0]?.date, "2026-11-02")
  assert.equal(parsed.stops[0]?.note, "道頓堀、大阪城")
})

check("中間插入後再回到同一城市", () => {
  const parsed = parseItinerary(
    `11/2 大阪
11/4 京都
11/6 大阪`,
    today,
  )
  assert.deepEqual(
    parsed.stops.map((stop) => stop.city.zh),
    ["大阪", "京都", "大阪"],
  )
})

check("沒有對上的城市", () => {
  const parsed = parseItinerary(
    `11/2 大阪
11/8 神戶`,
    today,
  )
  assert.deepEqual(names("11/2 大阪\n11/8 神戶"), ["大阪"])
  assert.deepEqual(parsed.unmatched, ["11/8 神戶"])
  assert.match(parsed.summary, /1 行沒有對上城市/)
})

check("同一行箭頭", () => {
  const parsed = parseItinerary("11/2 大阪 → 京都 → 奈良", today)
  assert.deepEqual(
    parsed.stops.map((stop) => stop.city.zh),
    ["大阪", "京都", "奈良"],
  )
  assert.equal(parsed.stops[0]?.date, "2026-11-02")
  assert.equal(parsed.stops[2]?.date, "2026-11-02")
})

check("日期區間只到該月", () => {
  const parsed = parseItinerary("2024/11/2-7 京都", today)
  assert.equal(parsed.startDate, "2024-11-02")
  assert.equal(parsed.endDate, "2024-11-07")
  assert.equal(parsed.stops[0]?.date, "2024-11-02")
})

check("時間不是日期", () => {
  const parsed = parseItinerary("11/2 14:30 大阪", today)
  assert.equal(parsed.stops[0]?.date, "2026-11-02")
  assert.equal(parsed.stops.length, 1)
})

check("沒有城市", () => {
  const parsed = parseItinerary("明天再想", today)
  assert.equal(parsed.stops.length, 0)
  assert.match(parsed.summary, /沒有讀出城市/)
})

check("nice 不會誤判成尼斯", () => {
  assert.deepEqual(names("a nice cafe"), [])
  assert.deepEqual(names("5/11 Nice"), ["尼斯"])
})

check("標題含城市但仍讀內文", () => {
  const parsed = parseItinerary(
    `京都自由行
11/2 大阪
11/4 奈良`,
    today,
  )
  assert.equal(parsed.title, "京都自由行")
  assert.deepEqual(
    parsed.stops.map((stop) => stop.city.zh),
    ["大阪", "奈良"],
  )
})

console.log("all passed")
