import { cityById } from "@/lib/cities"
import { stopFromCity } from "@/lib/geo"
import type { Trip } from "@/lib/types"

function requireCity(id: string) {
  const city = cityById(id)
  if (!city) throw new Error(`找不到示範城市 ${id}`)
  return city
}

export function createDemoTrips(): Trip[] {
  const osaka = stopFromCity(requireCity("jp-osaka"), "2024-11-02", "晚上直接去道頓堀。")
  const kyoto = stopFromCity(requireCity("jp-kyoto"), "2024-11-04", "清水寺留到晚上的點燈。")
  const nara = stopFromCity(requireCity("jp-nara"), "2024-11-06", "鹿餅要收好。")
  const rome = stopFromCity(requireCity("it-rome"), "2023-05-12")
  const florence = stopFromCity(requireCity("it-florence"), "2023-05-16", "黃昏留給米開朗基羅廣場。")
  const venice = stopFromCity(requireCity("it-venice"), "2023-05-18")

  return [
    {
      id: "demo-kansai",
      title: "關西的楓與鹿",
      startDate: "2024-11-02",
      endDate: "2024-11-07",
      notes: "這是一段示範旅程。清水寺的燈比白天安靜，奈良的鹿餅要收進袋子。你可以編輯、加上照片，或整段刪掉。",
      stops: [osaka, kyoto, nara],
      photos: [],
      createdAt: "2024-11-01T00:00:00.000Z",
    },
    {
      id: "demo-italy",
      title: "義大利的三座城",
      startDate: "2023-05-11",
      endDate: "2023-05-20",
      notes: "示範路線：羅馬走路很多，佛羅倫斯把黃昏留給對岸的廣場，威尼斯最後兩天不要再排博物館。",
      stops: [rome, florence, venice],
      photos: [],
      createdAt: "2023-05-01T00:00:00.000Z",
    },
  ]
}
