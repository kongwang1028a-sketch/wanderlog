import { partyFor } from "@/lib/companions"
import { cityById, type City } from "@/lib/cities"
import type { Stop, Trip } from "@/lib/types"

export const JAPAN_2018_TRIP_ID = "japan-2018"
export const JAPAN_2018_TITLE = "2018年10月 東京川越"

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

export function createJapan2018Trip(): Trip | null {
  const tokyo = cityById("jp-tokyo")
  const disney = cityById("jp-tokyo-disney")
  const kawagoe = cityById("jp-kawagoe")
  if (!tokyo || !disney || !kawagoe) return null

  const tokyoStop = placed(
    "japan-2018-tokyo",
    tokyo,
    "2018-10-28",
    [
      "10/28 桃園 06:40 飛成田，10:35 到。機票臺幣3008。機場第二航廈 4 樓吃元祖壽司。",
      "機場到市區日幣4700。日暮里轉北池袋日幣309。去程摩斯，去程計程車。",
      "14:00 北池袋 Buku Tokyo 東京日租，豐島區池袋本町4-3-3。飯店臺幣2450，現場每人再付日幣8750。",
      "15:40 神田明神，下午四點前有朱印。Lasox 神田明神店，偶像大師灰姑娘合作。",
      "秋葉原：アキバCOギャラリー、摩斯漢堡、ガチャポン会館、ちぃたん合作商店、虎之穴、アニメイト、福島屋超市、メロンブックス秋葉原1号店、PABLO。",
      "20:30 新御徒町，炭火燒肉上野・秘苑，再回北池袋。",
      "10/29 明治神宮外苑銀杏、BURN SIDE ST CAFE、明治神宮、kiddyland、NUBER SUGER、Dominique Ansel Bakery。",
      "新宿：COSME STORE、OS DRUG、丸井百貨、魔法少女リリカルなのは文化祭（11點到21點）、牛舌ねぎし、HARBS、タワーレコード。",
      "10/30 用 24 小時乘車券。YAESU初藤、THE MAPLE MANIA、外國人退稅櫃台、KITTE 中央郵局、東京一番街、高島屋外國人 95 折、日本橋寶可夢中心、日本橋屋長兵衛。",
      "銀座資生堂 Parlor、虎屋菓寮、Loft、無印良品有樂町、丸井有樂町。日比谷 HIBIYA CENTRAL MARKET、一角居酒屋、林屋新兵衛、BROOKLYN CITY GRILL。",
    ].join("\n"),
  )

  return {
    id: JAPAN_2018_TRIP_ID,
    title: JAPAN_2018_TITLE,
    startDate: "2018-10-28",
    endDate: "2018-11-02",
    notes: "76、DADA、梗梗、我廢。住北池袋 Buku Tokyo 東京日租。表上沒有航班編號。總花費臺幣11438、日幣23959。表上另有ふらんす亭，奈葉合作餐廳，入場費日幣1080，沒有排在哪一天。",
    ...partyFor(JAPAN_2018_TRIP_ID),
    stops: [
      tokyoStop,
      placed(
        "japan-2018-disney",
        disney,
        "2018-10-31",
        [
          "7:45 池袋接駁車日幣1000，不用訂，現場付。9:00 入園，門票臺幣2020，8/27 訂。",
          "11:00 外太空接觸領懷錶，11:00～11:40，已預約，謝66。",
          "表上的順序：怪獸電力 FP 11:20-12:20、小熊維尼、幽靈公館、艾莉絲、小小世界 FP 15:20-16:20、小飛俠、魔法長青、巴斯光年、奇想騰飛、星際旅行 FP 16:40-17:40、大賽車場、幽靈怪誕、派對狂歡樂、加勒比海 FP 19:10-20:10、夜間遊行、煙火、童話之夜。",
          "22:00 前離開。巴士 21:50 / 22:20，車資日幣555。",
        ].join("\n"),
      ),
      placed(
        "japan-2018-kawagoe",
        kawagoe,
        "2018-11-01",
        "8:30 去川越日幣411，一日券日幣300。10:00 柚屋本店和服，埼玉県川越市仲町1-4 2F，已預約。午餐小江戸オハナ鰻魚玉子燒日幣2000。冰川神社、菓子屋橫丁。",
      ),
      placed(
        "japan-2018-tokyo-return",
        tokyo,
        "2018-11-01",
        [
          "品川藏壽司。品川水族館日幣1700。海豚表演 5:30 P.M.、7:00 P.M.、8:30 P.M.。水族館咖啡廳。若沒有很晚，去新宿花園神社。半夜十二點前回北池袋。",
          "11/2 池袋 COFFEE VALLEY 早餐，西武池袋本店 9F かるかや午餐。14:00 從日暮里去機場，第三航廈。20:30 回台灣，機票臺幣3390。",
          "保險臺幣570。WiFi 機。",
        ].join("\n"),
      ),
    ],
    flights: [],
    stays: [{ id: "japan-2018-buku", name: "Buku Tokyo 東京日租", stopId: tokyoStop.id }],
    photos: [],
    createdAt: "2018-10-01T00:00:00.000Z",
  }
}
