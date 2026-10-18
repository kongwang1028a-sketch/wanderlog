import { partyFor } from "@/lib/companions"
import { cityById, type City } from "@/lib/cities"
import type { Stop, Trip } from "@/lib/types"

export const JAPAN_2019_TRIP_ID = "japan-2019"
export const JAPAN_2019_TITLE = "2019年9月 東京大阪神戶"

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

export function createJapan2019Trip(): Trip | null {
  const tokyo = cityById("jp-tokyo")
  const disney = cityById("jp-tokyo-disney")
  const osaka = cityById("jp-osaka")
  const kobe = cityById("jp-kobe")
  if (!tokyo || !disney || !osaka || !kobe) return null

  return {
    id: JAPAN_2019_TRIP_ID,
    title: JAPAN_2019_TITLE,
    startDate: "2019-09-28",
    endDate: "2019-10-05",
    notes: "同行：待待、梗梗。沒有飯店名稱，也沒有航班編號。",
    ...partyFor(JAPAN_2019_TRIP_ID),
    stops: [
      placed(
        "japan-2019-tokyo",
        tokyo,
        "2019-09-28",
        "9/28 水族館、晴空塔，晚餐鳥貴族。9/29 零食街、寶可夢咖啡，JR 到新大阪。",
      ),
      placed("japan-2019-disney", disney, "2019-09-30", "9/30 迪士尼。"),
      placed(
        "japan-2019-osaka",
        osaka,
        "2019-10-01",
        "10/1 新幹線。10/2 美津大阪燒、梅田、難波。10/3 環球影城。",
      ),
      placed("japan-2019-kobe", kobe, "2019-10-04", "10/4 神戶石田屋。"),
      placed("japan-2019-osaka-return", osaka, "2019-10-04", "10/4 大阪炸串。10/5 關西空港。"),
    ],
    flights: [],
    stays: [],
    photos: [],
    createdAt: "2019-09-01T00:00:00.000Z",
  }
}
