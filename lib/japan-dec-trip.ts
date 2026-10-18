import { partyFor } from "@/lib/companions"
import { cityById } from "@/lib/cities"
import { stopFromCity } from "@/lib/geo"
import type { Trip } from "@/lib/types"

export const JAPAN_DEC_TRIP_ID = "japan-dec-2024"
export const JAPAN_DEC_TITLE = "2024年12月 京都東京"

export function createJapanDecemberTrip(): Trip | null {
  const kyotoCity = cityById("jp-kyoto")
  const disneyCity = cityById("jp-tokyo-disney")
  const lakeCity = cityById("jp-kawaguchiko")
  if (!kyotoCity || !disneyCity || !lakeCity) return null
  const kyoto = stopFromCity(
    kyotoCity,
    "2024-12-14",
    "12/14–12/16 京都大倉飯店，兩間禁煙優越雙床房，含早餐。預約 027-0007****-01、027-0007****-02。12/16 退房，當天沒有另外寫住宿。",
  )
  const disney = stopFromCity(
    disneyCity,
    "2024-12-17",
    "12/17 東京迪士尼樂園飯店，美女與野獸客房，含早晚餐，預約 216***198。12/18 迪士尼大使飯店家庭房，含早晚餐，預約 216***583。",
  )
  const lake = stopFromCity(
    lakeCity,
    "2024-12-19",
    "12/19 富士景觀飯店，富士山側與庭園側各一間，晚餐是甲州牛法國料理。預約 2207-****-6340、2207-****-8951。12/20–12/21 拉維斯塔富士河口湖，兩間富士山景雙床房，晚餐是黑毛和牛壽喜燒。",
  )
  return {
    id: JAPAN_DEC_TRIP_ID,
    title: JAPAN_DEC_TITLE,
    startDate: "2024-12-14",
    endDate: "2024-12-21",
    notes: "同行：阿法、爸、媽。12/16 從京都退房，12/17 改住東京迪士尼。",
    ...partyFor(JAPAN_DEC_TRIP_ID),
    stops: [kyoto, disney, lake],
    flights: [],
    stays: [
      { id: `${JAPAN_DEC_TRIP_ID}-okura`, name: "京都大倉飯店", stopId: kyoto.id },
      { id: `${JAPAN_DEC_TRIP_ID}-tdh`, name: "東京迪士尼樂園飯店", stopId: disney.id },
      { id: `${JAPAN_DEC_TRIP_ID}-ambassador`, name: "迪士尼大使飯店", stopId: disney.id },
      { id: `${JAPAN_DEC_TRIP_ID}-fujiview`, name: "富士景觀飯店", stopId: lake.id },
      { id: `${JAPAN_DEC_TRIP_ID}-lavista`, name: "拉維斯塔富士河口湖", stopId: lake.id },
    ],
    photos: [],
    createdAt: "2024-12-01T00:00:00.000Z",
  }
}
