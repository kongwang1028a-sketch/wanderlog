import { stopFromCity } from "@/lib/geo"
import { parseItinerary } from "@/lib/itinerary"
import type { Trip } from "@/lib/types"

export const TOKYO_MAY_TRIP_ID = "tokyo-may-2024"
export const TOKYO_MAY_TITLE = "五月東京"

export const TOKYO_MAY_TEXT = `行程名稱：五月東京
第1天 (2024/05/18)
04:35 桃園國際機場 (停留 02時00分)
11:05 日本成田機場 (停留 02時00分)
14:17 東京上野東美滿如家飯店 (停留 01時00分)
15:38 淺草寺 雷門 (風雷神門) (停留 02時00分)
17:56 阿美橫丁入口 (停留 01時00分)
18:59 スシとテンぷら もがな 御徒町店 (停留 01時00分)
20:21 東京上野東美滿如家飯店 (停留 01時00分)
第2天 (2024/05/19)
07:00 東京上野東美滿如家飯店 (停留 01時00分)
08:27 DEPOT (停留 01時00分)
09:34 東京站一番街 (停留 02時30分)
12:34 新宿燒肉 牛舌の檸檬 (停留 01時50分)
14:54 寶可夢中心澀谷店 (停留 01時00分)
15:56 任天堂 東京旗艦店 (停留 01時00分)
16:56 Satella (停留 01時00分)
第3天 (2024/05/20)
08:00 東京上野東美滿如家飯店 (停留 01時00分)
09:47 東京迪士尼樂園 (停留 01時00分)
第4天 (2024/05/21)
07:30 東京上野東美滿如家飯店 (停留 01時00分)
09:18 東京華納兄弟哈利波特影城 (停留 05時00分)
14:44 A Happy Pancake Ikebukuro (停留 01時30分)
16:18 animate 池袋總店 (停留 01時00分)
第5天 (2024/05/22)
08:00 東京上野東美滿如家飯店 (停留 01時00分)
10:12 日本成田機場 (停留 03時18分)
16:30 桃園國際機場 (停留 01時00分)`

const NOTES = [
  "住東京上野東美滿如家飯店。淺草寺雷門、阿美橫丁、御徒町壽司天婦羅。5/19 東京站一番街、新宿牛舌、澀谷寶可夢中心、任天堂東京旗艦店。",
  "東京迪士尼樂園。",
  "華納兄弟哈利波特影城，接著池袋 A Happy Pancake、animate 池袋總店。",
]

const CITY_IDS = ["jp-tokyo", "jp-tokyo-disney", "jp-tokyo"]

export function createTokyoMayTrip(): Trip | null {
  const parsed = parseItinerary(TOKYO_MAY_TEXT, new Date(2026, 9, 17))
  if (parsed.stops.length !== CITY_IDS.length || parsed.startDate !== "2024-05-18" || parsed.endDate !== "2024-05-22") {
    return null
  }
  const stops = parsed.stops.map((stop, index) => stopFromCity(stop.city, stop.date, NOTES[index]))
  if (stops.some((stop, index) => stop.cityId !== CITY_IDS[index])) return null
  const hotelStop = stops[0]
  if (!hotelStop) return null
  return {
    id: TOKYO_MAY_TRIP_ID,
    title: TOKYO_MAY_TITLE,
    startDate: "2024-05-18",
    endDate: "2024-05-22",
    notes: "去程 5/18 04:35 桃園、11:05 成田。回程 5/22 10:12 成田、16:30 桃園。",
    stops,
    flights: [],
    stays: [{ id: `${TOKYO_MAY_TRIP_ID}-ueno`, name: "東京上野東美滿如家飯店", stopId: hotelStop.id }],
    photos: [],
    createdAt: "2024-05-01T00:00:00.000Z",
  }
}
