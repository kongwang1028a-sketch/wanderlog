import { partyFor } from "@/lib/companions"
import { cityById, type City } from "@/lib/cities"
import type { Stop, Trip } from "@/lib/types"

export const JAPAN_JUN_2023_TRIP_ID = "japan-jun-2023"
export const JAPAN_JUN_2023_TITLE = "2023年6月 大阪 (4天3夜)"
export const GERMANY_2017_TRIP_ID = "germany-2017"
export const GERMANY_2017_TITLE = "2017年 德國"
export const RUSSIA_2018_TRIP_ID = "russia-2018"
export const RUSSIA_2018_TITLE = "2018年 俄羅斯"

const PENDING = "詳細行程還沒找到。"

function placed(id: string, city: City, date: string, note: string): Stop {
  return {
    id,
    cityId: city.id,
    name: city.zh,
    country: city.country,
    countryCode: city.code,
    lat: city.lat,
    lng: city.lng,
    date,
    note,
  }
}

export function createJapanJun2023Trip(): Trip {
  const osaka = cityById("jp-osaka")
  if (!osaka) throw new Error("缺少大阪")
  const arrival = placed(
    "japan-jun-2023-osaka-0602",
    osaka,
    "2023-06-02",
    "6:30–10:10 飛機到大阪。早餐飛機餐。午餐大阪天守閣。18:00 力丸道頓堀吃到飽燒烤。住 MIMARU 難波 STATION。",
  )
  return {
    id: JAPAN_JUN_2023_TRIP_ID,
    title: JAPAN_JUN_2023_TITLE,
    startDate: "2023-06-02",
    endDate: "2023-06-05",
    notes: "同行：梗梗、丹丹、小咩(ㄒㄒ)。6/2–6/4 住 MIMARU 難波 STATION。",
    ...partyFor(JAPAN_JUN_2023_TRIP_ID),
    stops: [
      arrival,
      placed(
        "japan-jun-2023-osaka-0603",
        osaka,
        "2023-06-03",
        "海遊館。早餐便利商店。午餐天保山市場街、難波美食小巷。梅田。住 MIMARU 難波 STATION。",
      ),
      placed(
        "japan-jun-2023-osaka-0604",
        osaka,
        "2023-06-04",
        "環球影城，開園 9:00–21:00。早餐便利商店。午餐園區隨便吃。晚餐園區隨便吃（?）。住 MIMARU 難波 STATION。",
      ),
      placed(
        "japan-jun-2023-osaka-0605",
        osaka,
        "2023-06-05",
        "早餐難波八阪神社。晚餐飛機餐。18:30–20:30 飛機回台灣。",
      ),
    ],
    flights: [
      { id: "japan-jun-2023-out", aircraft: "去程", route: "6/2 6:30–10:10 到大阪" },
      { id: "japan-jun-2023-back", aircraft: "回程", route: "6/5 18:30–20:30 到台灣" },
    ],
    stays: [{ id: "japan-jun-2023-mimaru", name: "MIMARU 難波 STATION", stopId: arrival.id }],
    photos: [],
    createdAt: "2023-06-01T00:00:00.000Z",
  }
}

export function createGermany2017Trip(): Trip {
  return {
    id: GERMANY_2017_TRIP_ID,
    title: GERMANY_2017_TITLE,
    startDate: "2017-01-01",
    endDate: "2017-12-31",
    notes: "詳細行程還沒找到，先記 2017 年到過德國。",
    stops: [
      {
        id: "germany-2017-stop",
        name: "德國",
        country: "德國",
        countryCode: "DE",
        lat: 51.163,
        lng: 10.447,
        note: PENDING,
      },
    ],
    flights: [],
    stays: [],
    photos: [],
    createdAt: "2017-01-01T00:00:00.000Z",
  }
}

export function createRussia2018Trip(): Trip {
  return {
    id: RUSSIA_2018_TRIP_ID,
    title: RUSSIA_2018_TITLE,
    startDate: "2018-01-01",
    endDate: "2018-12-31",
    notes: "詳細行程還沒找到，先記 2018 年到過俄羅斯。",
    stops: [
      {
        id: "russia-2018-stop",
        name: "俄羅斯",
        country: "俄羅斯",
        countryCode: "RU",
        lat: 66.417,
        lng: 94.25,
        note: PENDING,
      },
    ],
    flights: [],
    stays: [],
    photos: [],
    createdAt: "2018-01-01T00:00:00.000Z",
  }
}
