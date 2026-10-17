import { cityById, type City } from "@/lib/cities"
import type { Stop, Trip } from "@/lib/types"

export const JAPAN_2019_FEB_TRIP_ID = "japan-2019-feb"
export const JAPAN_2019_FEB_TITLE = "2019年2月 東京"

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

export function createJapan2019FebTrip(): Trip | null {
  const tokyo = cityById("jp-tokyo")
  const disney = cityById("jp-tokyo-disney")
  if (!tokyo || !disney) return null

  const tokyoStop = placed(
    "japan-2019-feb-tokyo",
    tokyo,
    "2019-02-04",
    [
      "02/03 22:00 搭機場捷運到桃園第一航廈。02/04 01:15 後在一樓五號櫃台報到，02:55 前到登機門。",
      "07:15 到成田。四樓吃元祖壽司，旁邊有 Pokémon store。走到第二航廈地下買 Suica。13:31 京成本線到淺草橋，沒趕上就搭 13:51，在青砥換月台。",
      "15:00 アパホテル浅草橋駅北 check in，台東區淺草橋 3-1-10，電話 03-5833-9111。",
      "16:00 秋葉原：宅店、BIC CAMERA、扭蛋、貓頭鷹咖啡、萬世大樓。晚餐鳥貴族，淺草橋站附近大樓六樓，一份日幣302含稅。22:00 回旅館。",
      "02/05 06:30 都營地下鐵到淺草，先逛淺草寺。09:30 八重和服，店在 6 樓，最晚 17:30 還。10:00 雷門、仲見世。14:00 還和服。",
      "淺草牛かつ日幣1300起。壽々喜園抹茶日幣900內。浅草きびだんご あづま 日幣330／5串。㐂久屋串丸子日幣120／一串。",
      "15:00 走去晴空塔。橡子共和國、Pokémon Center。18:00 墨田水族館，日幣2050。大王巨足蟲日幣2200以上。21:00 從押上站回淺草橋。",
    ].join("\n"),
  )

  return {
    id: JAPAN_2019_FEB_TRIP_ID,
    title: JAPAN_2019_FEB_TITLE,
    startDate: "2019-02-04",
    endDate: "2019-02-10",
    notes: "住アパホテル浅草橋駅北。香草航空，去程 JW102、回程 JW101。座位標在文件圖片上，沒有寫座位號碼。迪士尼那天寫的是梗梗的行程，文件只附了交通。",
    stops: [
      tokyoStop,
      placed(
        "japan-2019-feb-disney",
        disney,
        "2019-02-06",
        "簡表寫迪士尼樂園。06:30 出門。淺草橋搭總武線往千葉到西船橋，06:42 或 06:49。換武藏野線往東京，07:12 或 07:24，舞濱下車。",
      ),
      placed(
        "japan-2019-feb-tokyo-return",
        tokyo,
        "2019-02-07",
        [
          "02/07 06:30 走到馬喰町，總武線快速到東京車站。07:00 找日本橋。09:00 一番街。",
          "12:00 經新橋轉百合海鷗線到台場。13:00 DiverCity 看鋼彈變形，下一場 15:00。文件寫不確定獨角獸有沒有換成大黃蜂。",
          "Aqua City、DECKS 夜景。晚餐在 DECKS 四樓吃章魚燒。21:00 從台場海濱公園站回淺草橋。",
          "02/08 池袋。07:30 西口公園。10:00 Sunshine 60。14:00 東池袋公園。15:00 乙女街。19:00 西武百貨，本館九樓金魚店。Animate 有兩棟。文件附了 Durarara 朝聖地圖。",
          "02/09 原宿。07:30 明治神宮。09:00 竹下通。11:00 表參道 Hills。13:00 貓街。15:00 澀谷，P5 朝聖。晚餐後回旅館收行李。簡表寫明治神宮 + 副都心。",
          "02/10 05:00 起床。06:07 都營淺草線到京成高砂，換京成本線到成田第二航廈，再走到第三航廈。最早 08:00 報到。",
        ].join("\n"),
      ),
    ],
    flights: [
      {
        id: "japan-2019-feb-jw102",
        aircraft: "JW102",
        route: "2/4 03:15 桃園－07:15 成田・香草航空",
      },
      {
        id: "japan-2019-feb-jw101",
        aircraft: "JW101",
        route: "2/10 10:00 成田－13:25 桃園・香草航空",
      },
    ],
    stays: [{ id: "japan-2019-feb-apa", name: "アパホテル浅草橋駅北", stopId: tokyoStop.id }],
    photos: [],
    createdAt: "2019-02-01T00:00:00.000Z",
  }
}
