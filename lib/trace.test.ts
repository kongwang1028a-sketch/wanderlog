import assert from "node:assert/strict"
import { clusterTracePoints, parseLocationText, sameTrace, type TracePoint } from "./trace"

const checks: [string, () => void][] = []
function check(name: string, run: () => void) {
  checks.push([name, run])
}

function photo(day: string, lat: number, lng: number): TracePoint {
  return { lat, lng, day, time: Date.parse(`${day}T12:00:00Z`), kind: "photo" }
}

function visit(day: string, endDay: string, lat: number, lng: number, label?: string, hotel = false): TracePoint {
  return {
    lat,
    lng,
    day,
    endDay,
    time: Date.parse(`${day}T00:00:00Z`),
    endTime: Date.parse(`${endDay}T18:00:00Z`),
    label,
    hotel,
    kind: "visit",
  }
}

check("照片依日期分成兩趟", () => {
  const result = clusterTracePoints(
    [
      photo("2019-07-02", 58.3019, -134.4197),
      photo("2019-07-03", 58.3019, -134.4197),
      photo("2019-07-05", 62.454, -114.3718),
      photo("2019-09-12", 48.8566, 2.3522),
    ],
    "photos",
  )
  assert.equal(result.trips.length, 2)
  assert.equal(result.trips[0]?.title, "朱諾、黃刀鎮")
  assert.equal(result.trips[0]?.startDate, "2019-07-02")
  assert.equal(result.trips[0]?.endDate, "2019-07-05")
  assert.equal(result.trips[1]?.title, "巴黎")
  assert.equal(result.missed, 0)
})

check("時間軸拿掉長期所在的城市", () => {
  const points: TracePoint[] = []
  for (let index = 0; index < 50; index += 1) {
    const day = new Date(Date.UTC(2022, 0, 1 + index)).toISOString().slice(0, 10)
    points.push({
      lat: 25.033,
      lng: 121.5654,
      day,
      endDay: day,
      time: Date.parse(`${day}T00:00:00Z`),
      endTime: Date.parse(`${day}T20:00:00Z`),
      kind: "sample",
    })
  }
  points.push(visit("2022-02-02", "2022-02-06", 34.6937, 135.5023))
  const result = clusterTracePoints(points, "timeline")
  assert.equal(result.trips.length, 1)
  assert.equal(result.trips[0]?.title, "大阪")
  assert.equal(result.trips[0]?.startDate, "2022-02-02")
})

check("太短的經過不算，旅館名稱會留下", () => {
  const parsed = parseLocationText(`{
    "timelineObjects": [
      {
        "placeVisit": {
          "location": { "latitudeE7": 583019000, "longitudeE7": -1344197000, "name": "Four Points by Sheraton Juneau" },
          "duration": { "startTimestamp": "2019-07-02T06:00:00.000Z", "endTimestamp": "2019-07-06T18:00:00.000Z" }
        }
      },
      {
        "placeVisit": {
          "location": { "latitudeE7": 346937000, "longitudeE7": 1355023000, "name": "Convenience" },
          "duration": { "startTimestamp": "2019-08-01T01:00:00.000Z", "endTimestamp": "2019-08-01T01:20:00.000Z" }
        }
      }
    ]
  }`)
  assert.equal(parsed.points.length, 2)
  const result = clusterTracePoints(parsed.points, "timeline")
  assert.equal(result.trips.length, 1)
  assert.equal(result.trips[0]?.title, "朱諾")
  assert.equal(result.trips[0]?.stays[0]?.name, "Four Points by Sheraton Juneau")
})

check("新的時間軸 JSON 與 GPX", () => {
  const json = parseLocationText(`{
    "semanticSegments": [
      {
        "startTime": "2023-07-01T02:00:00.000+09:00",
        "endTime": "2023-07-04T12:00:00.000+09:00",
        "visit": {
          "topCandidate": {
            "semanticType": "HOTEL",
            "name": "博多東急REI飯店",
            "placeLocation": { "latLng": "33.5904°, 130.4017°" }
          }
        }
      }
    ]
  }`)
  const clustered = clusterTracePoints(json.points, "timeline")
  assert.equal(clustered.trips[0]?.title, "福岡")
  assert.equal(clustered.trips[0]?.startDate, "2023-07-01")
  assert.equal(clustered.trips[0]?.stays.length, 1)

  const gpx = parseLocationText(`<?xml version="1.0"?>
    <gpx>
      <trk><trkseg>
        <trkpt lat="35.6762" lon="139.6503"><time>2024-04-02T08:00:00Z</time></trkpt>
        <trkpt lat="35.6762" lon="139.6503"><time>2024-04-02T18:00:00Z</time></trkpt>
        <trkpt lat="35.0116" lon="135.7681"><time>2024-04-04T09:00:00Z</time></trkpt>
        <trkpt lat="35.0116" lon="135.7681"><time>2024-04-05T09:00:00Z</time></trkpt>
      </trkseg></trk>
    </gpx>`)
  const route = clusterTracePoints(gpx.points, "timeline")
  assert.deepEqual(
    route.trips[0]?.stops.map((stop) => stop.city.zh),
    ["東京", "京都"],
  )
})

check("同一天同一路線不會重複加入", () => {
  const result = clusterTracePoints([photo("2018-01-02", 48.8566, 2.3522)], "photos")
  const draft = result.trips[0]
  assert.ok(draft)
  assert.equal(sameTrace(draft, { startDate: "2018-01-02", stops: [{ cityId: draft.stops[0]?.city.id }] }), true)
  assert.equal(sameTrace(draft, { startDate: "2019-01-02", stops: [{ cityId: draft.stops[0]?.city.id }] }), false)
})

let failed = 0
for (const [name, run] of checks) {
  try {
    run()
    console.log(`ok ${name}`)
  } catch (error) {
    failed += 1
    console.error(`fail ${name}`)
    console.error(error)
  }
}
if (failed > 0) process.exit(1)
