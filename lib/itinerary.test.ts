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
11/8 雙子鎮`,
    today,
  )
  assert.deepEqual(names("11/2 大阪\n11/8 雙子鎮"), ["大阪"])
  assert.deepEqual(parsed.unmatched, ["11/8 雙子鎮"])
  assert.match(parsed.summary, /1 行沒有對上城市/)
})

check("神戶、朱諾、黃刀鎮", () => {
  const parsed = parseItinerary(
    `極光之旅
10/3 朱諾
10/5 黃刀鎮
10/8 神戶`,
    today,
  )
  assert.deepEqual(
    parsed.stops.map((stop) => stop.city.zh),
    ["朱諾", "黃刀鎮", "神戶"],
  )
  assert.equal(parsed.stops[1]?.city.en, "Yellowknife")
  assert.deepEqual(names("10/3 Juneau\n10/5 Yellowknife\n10/6 黃刀"), ["朱諾", "黃刀鎮"])
})

check("星期夾在日期區間", () => {
  const parsed = parseItinerary("旅行日期：10月23日（四）～10月26日（日）\n10月24日 福岡", new Date(2025, 0, 1))
  assert.equal(parsed.startDate, "2025-10-23")
  assert.equal(parsed.endDate, "2025-10-26")
  assert.equal(parsed.stops[0]?.city.zh, "福岡")
  assert.equal(parsed.stops[0]?.date, "2025-10-24")
})

check("福岡完整行程表", () => {
  const parsed = parseItinerary(
    `🏯 2025年10月 福岡 4天3夜 行程總整理
旅行日期： 10月23日（四）～10月26日（日）

🛏️住宿資訊：
Day 1-2： 博多中央JR九州Blossom酒店 (近博多站)
Day 3： 博多東急REI飯店 (近博多站/天神)

✈️ 航班
去程
BR106　[訂位代碼: ECMGRS]
2025年10月23日 (2小時10分鐘)
08:10 桃園機場(TPE) - 2航廈
11:20 福岡機場(FUK) - I航廈
回程
JX841　[訂位代碼: ECVJ9J]
2025年10月26日 (2小時40分鐘)
19:10 福岡機場(FUK) - 國際航廈
20:50 桃園機場(TPE) - 1航廈

💡 行前必知重點整理
行李寄放 建議 Day 1 抵達後直接寄放飯店（博多中央JR九州Blossom），輕裝前往北九州。

📅 每日詳細行程與交通建議
☀️ Day 1：10月23日（四） 北九州動漫與百億夜景
11:00 抵達福岡機場 國際線轉免費接駁巴士至國內線，轉地下鐵空港線至博多。
13:00 飯店寄放行李/午餐 博多中央JR九州Blossom酒店寄放行李後，在博多站快速用餐。
14:00 博多 → 小倉 JR 特急列車（如：特急音速 Sonic）至 JR 小倉站（約 40-50 分鐘）。
15:00 AruAruCity 購物 JR 小倉站北口旁，動漫主題購物。
17:00 小倉 → 皿倉山 JR 鹿兒島本線至 JR 八幡站（約 15 分鐘）。
18:00 皿倉山纜車 搭乘纜車上山，欣賞日落與璀璨夜景。
20:30 皿倉山 → 博多 原路搭乘 JR 返回 JR 博多站。

🐟 Day 2：10月24日（五） 海洋探索之旅
09:00 博多 → 海之中道 JR 鹿兒島本線至香椎站，轉JR 香椎線至 JR 海之中道站。
10:00 海之中道海洋世界 全日參觀水族館，欣賞精彩的海豚表演。
17:00 返回博多 原路搭乘 JR 回 JR 博多站。

⛩️ Day 3：10月25日（六） 太宰府、竈門神社與 COCO'S 晚餐
09:00 博多 → 太宰府 西鐵直行巴士直達太宰府站。
10:00 太宰府天滿宮 參拜與表參道購物。
13:30 寶滿宮 竈門神社 太宰府循環巴士至終點站。
15:30 太宰府 → 博多 搭乘旅人號回 JR 博多站。
18:30 吉伊卡哇 x COCO'S 晚餐前往COCO'S 博多站南店。
20:00 博多運河城 參觀寶可夢中心。

🛍️ Day 4：10月26日（日） 購物與返程
10:00 天神購物 飯店 Check-out後，搭乘地鐵至天神站。
16:00 前往機場 JR 博多站搭乘地下鐵空港線至福岡機場站。
19:00 航班離開 準時登機。`,
    today,
  )
  assert.equal(parsed.title, "2025年10月 福岡 4天3夜")
  assert.equal(parsed.startDate, "2025-10-23")
  assert.equal(parsed.endDate, "2025-10-26")
  assert.deepEqual(
    parsed.stops.map((stop) => stop.city.zh),
    ["福岡", "北九州", "福岡"],
  )
  assert.equal(parsed.stops[0]?.date, "2025-10-23")
  assert.equal(parsed.stops[1]?.date, "2025-10-23")
  assert.match(parsed.stops[1]?.note ?? "", /皿倉山/)
  assert.match(parsed.stops[2]?.note ?? "", /太宰府天滿宮/)
  assert.equal(parsed.stops.some((stop) => stop.city.zh === "台北" || stop.city.zh === "鹿兒島"), false)
  assert.deepEqual(parsed.unmatched, [])
})

check("高山症不是高山", () => {
  assert.deepEqual(names("11/2 拉薩注意高山症"), [])
  assert.deepEqual(names("11/2 高山 宮川朝市"), ["高山"])
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

check("美加極光海陸旅行團", () => {
  const parsed = parseItinerary(
    `美加極光海陸旅行團
2026/9/19-10/3
9/19 台灣－西雅圖
9/20 西雅圖 登星辰公主號
9/21 內陸航道巡航
9/22 阿拉斯加 朱諾 (Juneau)
9/23 阿拉斯加 史凱威 (Skagway)
9/24 恩迪科特灣與道斯冰河巡航 (Endicott Arm & Dawes Glacier)
9/25 阿拉斯加 柯契侃 (Ketchikan)
9/26 溫哥華 下船－溫哥華市區
9/27 溫哥華－黃刀鎮
9/28-9/30 黃刀鎮 極光追尋與極地體驗
10/1 黃刀鎮－溫哥華 / 西雅圖
10/2 跨越國際換日線（機上）
10/3 抵達台灣`,
    today,
  )
  assert.equal(parsed.title, "美加極光海陸旅行團")
  assert.equal(parsed.startDate, "2026-09-19")
  assert.equal(parsed.endDate, "2026-10-03")
  assert.deepEqual(
    parsed.stops.map((stop) => stop.city.zh),
    ["西雅圖", "內陸航道", "朱諾", "史凱威", "恩迪科特灣", "柯契侃", "溫哥華", "黃刀鎮", "溫哥華", "西雅圖"],
  )
  assert.equal(parsed.stops[0]?.date, "2026-09-19")
  assert.equal(parsed.stops[0]?.note, "登星辰公主號")
  assert.equal(parsed.stops[4]?.date, "2026-09-24")
  assert.equal(parsed.stops[4]?.note, "道斯冰河")
  assert.equal(parsed.stops[7]?.date, "2026-09-27")
  assert.match(parsed.stops[7]?.note ?? "", /極光追尋/)
  assert.equal(parsed.stops[8]?.date, "2026-10-01")
  assert.equal(parsed.stops[9]?.date, "2026-10-01")
  assert.deepEqual(parsed.unmatched, [])
  assert.equal(parsed.stops.some((stop) => stop.city.code === "TW"), false)
})

console.log("all passed")
