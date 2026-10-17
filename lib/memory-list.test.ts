import assert from "node:assert/strict"
import { formatRange, totalTravelDays } from "./format"
import { parseMemoryList } from "./memory-list"
import type { Trip } from "./types"

function check(name: string, fn: () => void) {
  try {
    fn()
    console.log("ok", name)
  } catch (error) {
    console.error("FAIL", name)
    throw error
  }
}

check("年份和兩座城市", () => {
  const parsed = parseMemoryList("2019 朱諾、黃刀鎮")
  assert.equal(parsed.trips.length, 1)
  assert.deepEqual(
    parsed.trips[0]?.cities.map((city) => city.zh),
    ["朱諾", "黃刀鎮"],
  )
  assert.equal(parsed.trips[0]?.startDate, "2019-01-01")
  assert.equal(parsed.trips[0]?.endDate, "2019-12-31")
  assert.equal(formatRange(parsed.trips[0]?.startDate ?? "", parsed.trips[0]?.endDate ?? ""), "2019年")
})

check("年月、區間、季節、年份在最後", () => {
  const parsed = parseMemoryList(`2023年7月 福岡
2024/11/2-11/7 大阪、京都、奈良
2018夏天 巴黎
黃刀 2016`)
  assert.equal(parsed.trips[0]?.startDate, "2023-07-01")
  assert.equal(parsed.trips[0]?.endDate, "2023-07-31")
  assert.equal(formatRange("2023-07-01", "2023-07-31"), "2023年7月")
  assert.deepEqual(
    parsed.trips[1]?.cities.map((city) => city.zh),
    ["大阪", "京都", "奈良"],
  )
  assert.equal(parsed.trips[1]?.startDate, "2024-11-02")
  assert.equal(parsed.trips[1]?.endDate, "2024-11-07")
  assert.equal(parsed.trips[2]?.startDate, "2018-06-01")
  assert.equal(parsed.trips[2]?.endDate, "2018-08-31")
  assert.equal(parsed.trips[2]?.cities[0]?.zh, "巴黎")
  assert.equal(parsed.trips[3]?.cities[0]?.zh, "黃刀鎮")
  assert.equal(parsed.trips[3]?.startDate, "2016-01-01")
})

check("只有城市", () => {
  const parsed = parseMemoryList("巴黎、倫敦")
  assert.equal(parsed.trips.length, 1)
  assert.equal(parsed.trips[0]?.startDate, "")
  assert.deepEqual(
    parsed.trips[0]?.cities.map((city) => city.zh),
    ["巴黎", "倫敦"],
  )
})

check("自訂名稱", () => {
  const parsed = parseMemoryList("2019 關西自由行 大阪、京都")
  assert.equal(parsed.trips[0]?.title, "關西自由行")
})

check("沒有年份的單日行程不會拆成很多趟", () => {
  const parsed = parseMemoryList("11/2 大阪 道頓堀")
  assert.equal(parsed.trips.length, 0)
  assert.equal(parsed.skipped.length, 1)
})

check("桃園機場在出國那一行不會變成一站", () => {
  const parsed = parseMemoryList("2019 福岡 桃園機場")
  assert.deepEqual(
    parsed.trips[0]?.cities.map((city) => city.zh),
    ["福岡"],
  )
})

check("只寫年份的天數算一天", () => {
  const trips = [
    { startDate: "2019-01-01", endDate: "2019-12-31" },
    { startDate: "2019-11-02", endDate: "2019-11-07" },
  ] as Trip[]
  assert.equal(totalTravelDays(trips), 7)
})

console.log("all passed")
