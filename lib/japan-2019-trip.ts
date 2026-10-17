import { cityById, type City } from "@/lib/cities"
import type { Stop, Trip } from "@/lib/types"

export const JAPAN_2019_TRIP_ID = "japan-2019"
export const JAPAN_2019_TITLE = "2019年 日本"

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
    notes: "待待、梗梗。帳上寫成 /3 的金額照原樣保留。沒有飯店名稱，也沒有航班編號。",
    stops: [
      placed(
        "japan-2019-tokyo",
        tokyo,
        "2019-09-28",
        [
          "9/28 待待：早餐臺幣155、水族館門票日幣2050。隔天早餐吐司，謝謝待待。",
          "9/28 梗梗：晴空塔紀念照片日幣1500、晚餐鳥貴族日幣3852/3。",
          "9/29 待待：東京一番零食街蛋捲店日幣3801。",
          "9/29 梗梗：軟糖日幣200、很多餅乾日幣4084、寶可夢咖啡午餐日幣7959/3、寶可夢中心手帕 x2 日幣1080、JR車票東京到新大阪 43350/3元。",
        ].join("\n"),
      ),
      placed(
        "japan-2019-disney",
        disney,
        "2019-09-30",
        ["9/30 待待：迪士尼補票日幣200/3。", "9/30 梗梗：飯店尾款日幣26300/3、迪士尼豪華套餐日幣3700/3。"].join("\n"),
      ),
      placed(
        "japan-2019-osaka",
        osaka,
        "2019-10-01",
        [
          "10/1 待待：新幹線冰淇淋日幣330。",
          "10/1 梗梗：飯店日幣69400/3。",
          "10/2 待待：午餐美津大阪燒日幣4480/3。",
          "10/2 梗梗：梅田 Kiddy Land 76迪士尼公仔 x4 日幣1100、卡娜赫拉小包包日幣1650、幫莞茜代購美容粉 x2 日幣5662、晚餐難波 Park 日幣4158/3。",
          "10/3 待待：午餐環球影城哈利波特餐廳日幣6800/3。",
          "10/3 梗梗：晚餐環球影城小小兵餐廳日幣1400。",
        ].join("\n"),
      ),
      placed("japan-2019-kobe", kobe, "2019-10-04", "10/4 待待：午餐神戶石田屋牛排，加點柳橙汁日幣495。"),
      placed(
        "japan-2019-osaka-return",
        osaka,
        "2019-10-04",
        [
          "10/4 待待：晚餐大阪炸串日幣2508。",
          "10/4 梗梗：三井 Outlet 長袖帽T日幣3300。帳上沒寫是哪一座。",
          "10/5 待待：飛機上阿里山茶葉組臺幣1480。",
          "10/5 梗梗：rapit 車票大阪到關西空港日幣3870/3。",
        ].join("\n"),
      ),
    ],
    flights: [],
    stays: [],
    photos: [],
    createdAt: "2019-09-01T00:00:00.000Z",
  }
}
