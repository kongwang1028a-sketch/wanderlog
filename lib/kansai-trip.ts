import { stopFromCity } from "@/lib/geo"
import { parseItinerary } from "@/lib/itinerary"
import type { Trip } from "@/lib/types"

export const KANSAI_TRIP_ID = "kansai-2026"
export const KANSAI_TITLE = "2026年8月 關西"

export const KANSAI_TEXT = `8/6 after 15:00 checking, 大阪 downtown
8/7 京都  西織鎮 西陣織會館 和服秀、 清水寺、 伏見稲荷大社 千本鳥居
8/8 姬路城 神戶異人館、 ミュージック・グルメ船コンチェルト （ミュージック・グルメセンコンチェルト）dinner
8/9 USJ 哈利
8/10 大阪 有馬溫泉 泡湯 and 懷石料理
8/11 柰良 東大寺、春日大社、中谷堂紅豆大福推薦
8/12 白川郷・荻町合掌造り集落
8/13 Check out and tour 大阪 til; 18:00 for flight at night`

const NOTES = [
  "15:00 後入住，市區。",
  "西陣織會館和服秀、清水寺、伏見稻荷千本鳥居。",
  "姬路城。",
  "北野異人館，晚上音樂美食船晚餐。",
  "環球影城，哈利波特園區。",
  "泡湯與懷石料理。",
  "東大寺、春日大社，中谷堂紅豆大福。",
  "荻町合掌造集落。",
  "退房後市區到 18:00，晚上班機離開。",
]

const CITY_IDS = [
  "jp-osaka",
  "jp-kyoto",
  "jp-himeji",
  "jp-kobe",
  "jp-osaka",
  "jp-arima",
  "jp-nara",
  "jp-shirakawa",
  "jp-osaka",
]

export function createKansaiTrip(): Trip | null {
  const parsed = parseItinerary(KANSAI_TEXT, new Date(2026, 9, 17))
  if (parsed.stops.length !== CITY_IDS.length || parsed.startDate !== "2026-08-06" || parsed.endDate !== "2026-08-13") {
    return null
  }
  const stops = parsed.stops.map((stop, index) => stopFromCity(stop.city, stop.date, NOTES[index]))
  if (stops.some((stop, index) => stop.cityId !== CITY_IDS[index])) return null
  return {
    id: KANSAI_TRIP_ID,
    title: KANSAI_TITLE,
    startDate: "2026-08-06",
    endDate: "2026-08-13",
    notes: "8/6 下午入住大阪。8/9 環球影城。8/10 有馬溫泉泡湯、懷石。8/13 晚上從大阪離開。",
    stops,
    flights: [],
    stays: [],
    photos: [],
    createdAt: "2026-08-01T00:00:00.000Z",
  }
}
