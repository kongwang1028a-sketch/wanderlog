import { cityById } from "@/lib/cities"
import { stopFromCity } from "@/lib/geo"
import type { Trip } from "@/lib/types"

export const YOKOHAMA_TRIP_ID = "yokohama-kamakura-2026"
export const YOKOHAMA_TITLE = "橫濱、鎌倉"

export function createYokohamaTrip(): Trip | null {
  const yokohamaCity = cityById("jp-yokohama")
  const kamakuraCity = cityById("jp-kamakura")
  if (!yokohamaCity || !kamakuraCity) return null
  const yokohama = stopFromCity(
    yokohamaCity,
    "2026-01-17",
    "住在港未來。橫濱站東口步行約 11 分鐘，新高島站 4 號出口約 5 分鐘。",
  )
  const kamakura = stopFromCity(kamakuraCity)
  return {
    id: YOKOHAMA_TRIP_ID,
    title: YOKOHAMA_TITLE,
    startDate: "2026-01-17",
    endDate: "2026-01-20",
    notes: "同行：玟璇、梗梗。去回都是經濟艙，機上註記 Wifi Magic5，各可累積 931 哩。",
    stops: [yokohama, kamakura],
    flights: [
      {
        id: `${YOKOHAMA_TRIP_ID}-jl96`,
        aircraft: "JL96",
        route: "1/17 09:10 松山－13:00 羽田・經濟艙",
      },
      {
        id: `${YOKOHAMA_TRIP_ID}-jl99`,
        aircraft: "JL99",
        route: "1/20 18:10 羽田－21:00 松山・經濟艙",
      },
    ],
    stays: [{ id: `${YOKOHAMA_TRIP_ID}-hilton`, name: "橫濱希爾頓酒店", stopId: yokohama.id }],
    photos: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  }
}
