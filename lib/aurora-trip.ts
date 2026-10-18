import { partyFor } from "@/lib/companions"
import { stopFromCity } from "@/lib/geo"
import { parseItinerary } from "@/lib/itinerary"
import type { Trip } from "@/lib/types"

export const AURORA_TRIP_ID = "aurora-pacific-2026"
export const AURORA_TITLE = "2026年9月 美加 (極光)"

export const AURORA_TEXT = `美加極光海陸旅行團
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
10/3 抵達台灣`

export function createAuroraTrip(): Trip | null {
  const parsed = parseItinerary(AURORA_TEXT, new Date(2026, 8, 1))
  if (parsed.stops.length < 8 || !parsed.startDate || !parsed.endDate) return null
  const stops = parsed.stops.map((stop) => stopFromCity(stop.city, stop.date, stop.note))
  const shipStop = stops.find((stop) => stop.cityId === "us-seattle")
  return {
    id: AURORA_TRIP_ID,
    title: AURORA_TITLE,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    notes: "10/2 在飛機上跨越國際換日線，10/3 抵達台灣。",
    ...partyFor(AURORA_TRIP_ID),
    stops,
    flights: [],
    stays: [{ id: `${AURORA_TRIP_ID}-ship`, name: "星辰公主號", stopId: shipStop?.id }],
    photos: [],
    createdAt: "2026-09-01T00:00:00.000Z",
  }
}
