import type { Trip } from "@/lib/types"

export const JAPAN_JUN_2023_TRIP_ID = "japan-jun-2023"
export const JAPAN_JUN_2023_TITLE = "2023年6月 日本"
export const GERMANY_2017_TRIP_ID = "germany-2017"
export const GERMANY_2017_TITLE = "2017年 德國"
export const RUSSIA_2018_TRIP_ID = "russia-2018"
export const RUSSIA_2018_TITLE = "2018年 俄羅斯"
export const JAPAN_2018_TRIP_ID = "japan-2018"
export const JAPAN_2018_TITLE = "2018年 日本"

const PENDING = "詳細行程還沒找到。"

export function createJapanJun2023Trip(): Trip {
  return {
    id: JAPAN_JUN_2023_TRIP_ID,
    title: JAPAN_JUN_2023_TITLE,
    startDate: "2023-06-02",
    endDate: "2023-06-05",
    notes: "詳細行程還沒找到，先記 2023年6月2日至5日到過日本。",
    stops: [
      {
        id: "japan-jun-2023-stop",
        name: "日本",
        country: "日本",
        countryCode: "JP",
        lat: 39.3,
        lng: 141.1,
        date: "2023-06-02",
        note: PENDING,
      },
    ],
    flights: [],
    stays: [],
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

export function createJapan2018Trip(): Trip {
  return {
    id: JAPAN_2018_TRIP_ID,
    title: JAPAN_2018_TITLE,
    startDate: "2018-01-01",
    endDate: "2018-12-31",
    notes: "詳細行程還沒找到，先記 2018 年到過日本。",
    stops: [
      {
        id: "japan-2018-stop",
        name: "日本",
        country: "日本",
        countryCode: "JP",
        lat: 39.3,
        lng: 141.1,
        note: PENDING,
      },
    ],
    flights: [],
    stays: [],
    photos: [],
    createdAt: "2018-01-01T00:00:00.000Z",
  }
}
