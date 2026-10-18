import { stopFromCity } from "@/lib/geo"
import { parseItinerary } from "@/lib/itinerary"
import type { Trip } from "@/lib/types"

export const FUKUOKA_TRIP_ID = "fukuoka-2025"
export const FUKUOKA_TITLE = "2025年10月 福岡北九州 (4天3夜)"

export const FUKUOKA_TEXT = `🏯 2025年10月 福岡 4天3夜 行程總整理
旅行日期： 10月23日（四）～10月26日（日）

🛏️住宿資訊：
Day 1-2： 博多中央JR九州Blossom酒店 (近博多站)
Day 3： 博多東急REI飯店 (近博多站/天神)

✈️ 航班
去程
BR106　[訂位代碼: EC**RS]
2025年10月23日 (2小時10分鐘)
08:10 桃園機場(TPE) - 2航廈
11:20 福岡機場(FUK) - I航廈
回程
JX841　[訂位代碼: EC**9J]
2025年10月26日 (2小時40分鐘)
19:10 福岡機場(FUK) - 國際航廈
20:50 桃園機場(TPE) - 1航廈

💡 行前必知重點整理
項目 建議處理事項 備註
行李寄放 建議 Day 1 抵達後直接寄放飯店（博多中央JR九州Blossom），輕裝前往北九州。 飯店免費服務，比車站置物櫃更安心且方便。
交通票券 JR 特急指定席：建議事先購買 Day 1 往返北九州的車票/指定席。 可在 JR 綠色窗口購買。
熱門活動 吉伊卡哇 x COCO'S：活動期間需確認福岡合作店鋪及是否需抽號/預約。 建議將晚餐安排在 Day 3 靠近博多車站的分店。
門票預訂 海之中道海洋世界：建議提前線上購票，省去現場排隊時間。 皿倉山纜車、神社參拜皆可現場購票或免費入場。

📅 每日詳細行程與交通建議
☀️ Day 1：10月23日（四） 北九州動漫與百億夜景
時間 行程 交通方式
11:00 抵達福岡機場 國際線轉免費接駁巴士至國內線，轉地下鐵空港線至博多。
13:00 飯店寄放行李/午餐 博多中央JR九州Blossom酒店寄放行李後，在博多站快速用餐。
14:00 博多 → 小倉 JR 特急列車（如：特急音速 Sonic）至 JR 小倉站（約 40-50 分鐘）。
15:00 AruAruCity 購物 JR 小倉站北口旁，動漫主題購物。
17:00 小倉 → 皿倉山 JR 鹿兒島本線至 JR 八幡站（約 15 分鐘）。
17:30 前往山麓站 JR 八幡站轉乘免費接駁巴士或計程車（約 5 分鐘）。
18:00 皿倉山纜車 搭乘纜車上山，欣賞日落與璀璨夜景。
20:30 皿倉山 → 博多 原路搭乘 JR 返回 JR 博多站。
21:30 飯店休息

🐟 Day 2：10月24日（五） 海洋探索之旅
時間 行程 交通方式
09:00 博多 → 海之中道 JR 鹿兒島本線至香椎站，轉JR 香椎線至 JR 海之中道站（總車程約 50-60 分鐘）。
10:00 海之中道海洋世界 全日參觀水族館，欣賞精彩的海豚表演。
17:00 返回博多 原路搭乘 JR 回 JR 博多站。
18:30 晚餐/自由活動 博多或天神地區享用福岡特色美食（如牛雜鍋），或在車站周邊購物。

⛩️ Day 3：10月25日（六） 太宰府、竈門神社與 COCO'S 晚餐
時間 行程 交通方式
09:00 博多 → 太宰府 博多巴士總站搭乘 西鐵直行巴士「旅人」號直達 太宰府站（約 40 分鐘）。
10:00 太宰府天滿宮 參拜與表參道購物（梅枝餅必吃）。
13:30 寶滿宮 竈門神社 太宰府循環巴士「まほろば號」（往「內山」方向）至終點站（約 10 分鐘）。
15:30 太宰府 → 博多 搭乘「旅人」號或西鐵電車回 JR 博多站。
17:00 換飯店 Check-in 入住博多東急REI飯店，放下行李。
18:30 吉伊卡哇 x COCO'S 晚餐前往COCO'S 博多站南店（或選定分店），參與合作活動。
20:00 博多運河城 步行或搭公車前往 Canal City Hakata，參觀寶可夢中心。

🛍️ Day 4：10月26日（日） 購物與返程
時間 行程 交通方式
10:00 天神購物 飯店 Check-out後，搭乘地鐵至 天神站（約 5 分鐘）。
10:30 Chiikawa Land & 動漫 逛 福岡 PARCO 8F 的 Chiikawa Land、Animate 等。
14:30 返回博多 搭地鐵回博多站，領取寄放的行李。
15:00 最終採買 JR 博多城、博多阪急百貨等地進行伴手禮採購。
16:00 前往機場 JR 博多站搭乘地下鐵空港線至 福岡機場站。
16:30 機場報到 抵達國內線後，轉乘免費接駁巴士至國際線航廈辦理登機手續。
19:00 航班離開 準時登機。`

export function createFukuokaTrip(): Trip | null {
  const parsed = parseItinerary(FUKUOKA_TEXT, new Date(2025, 9, 1))
  if (parsed.stops.length < 3 || parsed.startDate !== "2025-10-23" || parsed.endDate !== "2025-10-26") return null
  const stops = parsed.stops.map((stop) => stopFromCity(stop.city, stop.date, stop.note))
  const arrival = stops[0]
  const kitakyushu = stops[1]
  const stay = stops[stops.length - 1]
  if (!arrival || !kitakyushu || !stay) return null
  if (arrival.cityId !== "jp-fukuoka" || kitakyushu.cityId !== "jp-kitakyushu" || stay.cityId !== "jp-fukuoka") return null
  arrival.date = "2025-10-23"
  arrival.note = "抵達福岡機場。行李先寄放博多中央JR九州Blossom酒店，再前往北九州。"
  kitakyushu.date = "2025-10-23"
  kitakyushu.note = "小倉 AruAruCity，傍晚搭皿倉山纜車看日落與夜景。"
  stay.date = "2025-10-24"
  stay.note = "10/24 海之中道海洋世界。10/25 太宰府天滿宮、竈門神社，換住博多東急REI飯店，晚餐 COCO'S，博多運河城。10/26 天神購物後返程。"
  return {
    id: FUKUOKA_TRIP_ID,
    title: FUKUOKA_TITLE,
    startDate: "2025-10-23",
    endDate: "2025-10-26",
    notes: "去程 BR106，訂位 EC**RS。回程 JX841，訂位 EC**9J。Day 1-2 住博多中央JR九州Blossom酒店，Day 3 住博多東急REI飯店。",
    stops,
    flights: [
      {
        id: `${FUKUOKA_TRIP_ID}-br106`,
        aircraft: "BR106",
        route: "10/23 08:10 桃園 T2－11:20 福岡 I航廈・訂位 EC**RS",
      },
      {
        id: `${FUKUOKA_TRIP_ID}-jx841`,
        aircraft: "JX841",
        route: "10/26 19:10 福岡國際航廈－20:50 桃園 T1・訂位 EC**9J",
      },
    ],
    stays: [
      { id: `${FUKUOKA_TRIP_ID}-blossom`, name: "博多中央JR九州Blossom酒店", stopId: arrival.id },
      { id: `${FUKUOKA_TRIP_ID}-rei`, name: "博多東急REI飯店", stopId: stay.id },
    ],
    photos: [],
    createdAt: "2025-10-01T00:00:00.000Z",
  }
}
