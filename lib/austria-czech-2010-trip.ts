import { cityById } from "@/lib/cities"
import type { Trip } from "@/lib/types"

export const AUSTRIA_CZECH_2010_TRIP_ID = "austria-czech-2010"
export const AUSTRIA_CZECH_2010_TITLE = "2010年 奧地利、捷克"

export function createAustriaCzech2010Trip(): Trip | null {
  const prague = cityById("cz-prague")
  if (!prague) return null
  return {
    id: AUSTRIA_CZECH_2010_TRIP_ID,
    title: AUSTRIA_CZECH_2010_TITLE,
    startDate: "2010-07-31",
    endDate: "2010-07-31",
    notes: "目前只有一張照片。相簿名稱是「2010奧地利捷克 05 布拉格」，檔名 288_Original.JPG。拍攝資訊是 2010年7月31日 上午11:44 GMT+8，SANYO CA65。奧地利沒有出現城市，地圖上先不標。",
    stops: [
      {
        id: "austria-czech-2010-prague",
        cityId: prague.id,
        name: prague.zh,
        country: prague.country,
        countryCode: prague.code,
        lat: prague.lat,
        lng: prague.lng,
        date: "2010-07-31",
        note: "這張照片拍的是布拉格。",
      },
    ],
    flights: [],
    stays: [],
    photos: [],
    createdAt: "2010-07-31T03:44:00.000Z",
  }
}
