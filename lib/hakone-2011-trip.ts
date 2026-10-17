import { cityById } from "@/lib/cities"
import type { Trip } from "@/lib/types"

export const HAKONE_2011_TRIP_ID = "hakone-2011"
export const HAKONE_2011_TITLE = "2011年1月 箱根"

export function createHakone2011Trip(): Trip | null {
  const hakone = cityById("jp-hakone")
  if (!hakone) return null
  return {
    id: HAKONE_2011_TRIP_ID,
    title: HAKONE_2011_TITLE,
    startDate: "2011-01-26",
    endDate: "2011-01-26",
    notes: "目前只有一張照片。小田急箱根纜車大涌谷站，牌子寫標高 1044 公尺。檔名 SANY1209_Original.JPG。拍攝資訊是 2011年1月26日 上午11:13 GMT+8，SANYO CA65。照片沒有定位，地點是看站牌。",
    stops: [
      {
        id: "hakone-2011-owakudani",
        cityId: hakone.id,
        name: hakone.zh,
        country: hakone.country,
        countryCode: hakone.code,
        lat: hakone.lat,
        lng: hakone.lng,
        date: "2011-01-26",
        note: "這張照片拍的是大涌谷。",
      },
    ],
    flights: [],
    stays: [],
    photos: [],
    createdAt: "2011-01-26T03:13:00.000Z",
  }
}
