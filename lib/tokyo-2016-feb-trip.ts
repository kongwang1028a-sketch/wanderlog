import { cityById, type City } from "@/lib/cities"
import type { Stop, Trip } from "@/lib/types"

export const TOKYO_2016_FEB_TRIP_ID = "tokyo-2016-feb"
export const TOKYO_2016_FEB_TITLE = "2016年2月 東京"

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

export function createTokyo2016FebTrip(): Trip | null {
  const tokyo = cityById("jp-tokyo")
  const disney = cityById("jp-tokyo-disney")
  if (!tokyo || !disney) return null

  const tokyoStop = placed(
    "tokyo-2016-feb-tokyo",
    tokyo,
    "2016-02-29",
    [
      "約早上八點到桃園。JL802，10:00 桃園第二航廈，14:00 成田第二航廈。經濟艙，波音 767，直飛 3 小時，有餐。午餐是飛機餐，飲料記得点梅酒。",
      "買交通券後去飯店。N'EX 東京來回套票日幣4000。Suica。Tokyo Subway Ticket 三日券。約 16:00～17:00 到 Super Hotel 秋葉原末広町，電話 03-6848-9000。銀座線末広町站步行 2 分，御徒町站步行 5 分，秋葉原站步行 7 分。早餐 7:00～9:00。",
      "晚餐隨便吃。接著晴空塔逛街，押上站。展望台 8:00～22:00。350 公尺日幣2060，450 公尺再加日幣1030。",
    ].join("\n"),
  )

  return {
    id: TOKYO_2016_FEB_TRIP_ID,
    title: TOKYO_2016_FEB_TITLE,
    startDate: "2016-02-29",
    endDate: "2016-03-04",
    notes: "文件標題寫 2015，實際是 2016。五天四夜。丹丹吃漢堡、ㄆㄆ、阿閒、ㄒㄒ、ㄘㄘ、梗梗。飯店日幣24000／4晚，現場付現。迪士尼門票臺幣2050。WiFi 分享器 2 入，一人臺幣417。",
    stops: [
      tokyoStop,
      placed(
        "tokyo-2016-feb-disney",
        disney,
        "2016-03-01",
        [
          "早餐前一天自備。7:00 出門。秋葉原搭京濱東北線蒲田行到東京，轉京葉線蘇我行到舞濱。開園 8:00～22:00。晚上 11 點半都還有車。",
          "8:00 抽怪獸電力 FP 10:20-11:20，排小熊維尼。8:45 幽靈公館。9:55 艾莉絲，ㄆㄆ幫忙抽飛濺山 FP 15:20-16:20。10:15 冰雪夢幻大遊行。10:05 前排小飛俠。10:25 玩怪獸電力。10:35 魔法長青。",
          "11:30 午餐，抽童話之夜。12:00 抽巨雷山 FP 19:10-20:10。逛卡通城。13:00 獨木舟。13:35 幸福在這裡。14:00 抽星際旅行 FP 16:40-17:40，加勒比海盜。14:55 大賽車場。15:30 又有冰雪夢幻大遊行。15:40 飛濺山。16:00 太空山，不排的人先吃晚餐。",
          "18:25 電子大遊行。19:10 巨雷山。19:35 童話之夜。20:30 煙火。22:00 前離開，可以在外面的紀念品店逛。",
        ].join("\n"),
      ),
      placed(
        "tokyo-2016-feb-tokyo-return",
        tokyo,
        "2016-03-02",
        [
          "03/02 飯店早餐。8:30 出發。三鷹吉卜力美術館 10:00。秋葉原地鐵到三鷹，接駁車日幣210。預約編號 8696****13，取票編號 1081****11。大人票 6 張共日幣6000。",
          "再回三鷹轉澀谷。午餐白貓餐廳，涉谷 PARCO PART3 三樓。東急、丸荒、松本清、MARUI、唐吉軻德、hikarie、PABLO、MANDARAKE、ANIMATE。澀谷也有一蘭。晚上看情況再回秋葉原。",
          "03/03 飯店早餐。淺草寺，和服「壽々喜園」預約 10:30，台東區淺草 3-4-3。末広町搭銀座線到淺草，一號出口到雷門，七號出口到和服店。午餐一蘭約日幣790。晚餐執事，秋葉原解決。下午回秋葉原。",
          "03/04 飯店早餐。午餐築地生魚片。末広町經上野廣小路轉大江戶線到築地市場。約下午四點到成田。秋葉原搭京濱東北線大船行到東京。JL809，18:10 成田第二航廈，21:40 桃園第二航廈。經濟艙，波音 767，4 小時 30 分，晚餐是飛機餐。",
        ].join("\n"),
      ),
    ],
    flights: [
      {
        id: "tokyo-2016-feb-jl802",
        aircraft: "JL802",
        route: "2/29 10:00 桃園 T2－14:00 成田 T2・日本航空・波音 767・經濟艙",
      },
      {
        id: "tokyo-2016-feb-jl809",
        aircraft: "JL809",
        route: "3/4 18:10 成田 T2－21:40 桃園 T2・日本航空・波音 767・經濟艙",
      },
    ],
    stays: [{ id: "tokyo-2016-feb-super", name: "Super Hotel 秋葉原末広町", stopId: tokyoStop.id }],
    photos: [],
    createdAt: "2016-02-01T00:00:00.000Z",
  }
}
