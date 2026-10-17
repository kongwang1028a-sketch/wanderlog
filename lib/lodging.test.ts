import assert from "node:assert/strict"
import { extractTripDetails } from "./lodging"

const checks: [string, () => void][] = []
function check(name: string, run: () => void) {
  checks.push([name, run])
}

check("行程表裡的旅館與航班", () => {
  const details = extractTripDetails(`🛏️住宿資訊：
Day 1-2： 博多中央JR九州Blossom酒店 (近博多站)
Day 3： 博多東急REI飯店 (近博多站/天神)
✈️ 航班
BR106　[訂位代碼: ECMGRS]
機型：波音 787-9
回程
JX841　[訂位代碼: ECVJ9J]
行李寄放 建議 Day 1 抵達後直接寄放飯店（博多中央JR九州Blossom），輕裝前往北九州。
13:00 飯店寄放行李/午餐 博多中央JR九州Blossom酒店寄放行李後，在博多站快速用餐。`)
  assert.deepEqual(
    details.stays.map((stay) => stay.name),
    ["博多中央JR九州Blossom酒店", "博多東急REI飯店"],
  )
  assert.deepEqual(details.flights, [
    { aircraft: "波音 787-9", route: "BR106" },
    { aircraft: "", route: "JX841" },
  ])
})

let failed = 0
for (const [name, run] of checks) {
  try {
    run()
    console.log(`ok ${name}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${name}`)
    console.error(error)
  }
}
if (failed > 0) process.exit(1)
