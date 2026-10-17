"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatRange } from "@/lib/format"
import { nearestCity } from "@/lib/geo"
import { compressImage } from "@/lib/images"
import {
  clusterTracePoints,
  parseLocationText,
  readExifDay,
  sameTrace,
  type TraceDraft,
  type TracePoint,
} from "@/lib/trace"
import type { Trip } from "@/lib/types"

const MAX_FILE_BYTES = 55_000_000
const MAX_PHOTOS = 8

type PhotoHit = {
  file: File
  cityId: string
  day: string
  time: number
}

export type TraceImport = TraceDraft & {
  photos: { blob: Blob; cityId: string; caption: string }[]
}

export function TraceImportDialog({
  open,
  onOpenChange,
  existing,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: Trip[]
  onAdd: (trips: TraceImport[]) => void
}) {
  const [points, setPoints] = useState<TracePoint[]>([])
  const [hits, setHits] = useState<PhotoHit[]>([])
  const [source, setSource] = useState<"photos" | "timeline">("photos")
  const [keepPhotos, setKeepPhotos] = useState(true)
  const [status, setStatus] = useState("")
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)

  const clustered = useMemo(() => clusterTracePoints(points, source), [points, source])
  const preview = useMemo(() => {
    const freshTrips = clustered.trips.filter((trip) => !existing.some((item) => sameTrace(trip, item)))
    const photoCount = keepPhotos ? freshTrips.reduce((total, trip) => total + selectHits(trip, hits).length, 0) : 0
    return { fresh: freshTrips, duplicates: clustered.trips.length - freshTrips.length, photoCount }
  }, [clustered, existing, hits, keepPhotos])

  function reset() {
    setPoints([])
    setHits([])
    setStatus("")
    setReading(false)
    setSaving(false)
  }

  async function onPhotos(list: FileList | null) {
    const files = [...(list ?? [])]
    if (files.length === 0) return
    setReading(true)
    setSource("photos")
    setPoints([])
    setHits([])
    const nextPoints: TracePoint[] = []
    const nextHits: PhotoHit[] = []
    let skipped = 0
    const exifr = (await import("exifr")).default
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      if (!file) continue
      if (index % 5 === 0) setStatus(`正在讀取照片 ${index + 1} / ${files.length}`)
      try {
        const gps = await exifr.gps(file)
        if (!gps || typeof gps.latitude !== "number" || typeof gps.longitude !== "number") {
          skipped += 1
          continue
        }
        const meta = await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"], reviveValues: false })
        const day = readExifDay(meta?.DateTimeOriginal) || readExifDay(meta?.CreateDate)
        const time = day ? Date.parse(`${day}T12:00:00`) : 0
        const city = nearestCity(gps.latitude, gps.longitude, 80)
        nextPoints.push({ lat: gps.latitude, lng: gps.longitude, time, day, kind: "photo" })
        if (city) nextHits.push({ file, cityId: city.id, day, time })
      } catch {
        skipped += 1
      }
    }
    const clusteredPhotos = clusterTracePoints(nextPoints, "photos")
    setPoints(nextPoints)
    setHits(nextHits)
    setStatus(skipped > 0 ? `${clusteredPhotos.summary} ${skipped} 張沒有拍攝地點。` : clusteredPhotos.summary)
    setReading(false)
  }

  async function onTracks(list: FileList | null) {
    const files = [...(list ?? [])]
    if (files.length === 0) return
    setReading(true)
    setSource("timeline")
    setHits([])
    setStatus("正在讀取位置檔…")
    const nextPoints: TracePoint[] = []
    const notes: string[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        notes.push(`${file.name} 太大。請改放每個月的位置紀錄，不要放整份原始軌跡。`)
        continue
      }
      const text = await file.text()
      const parsed = parseLocationText(text)
      if (parsed.points.length === 0) {
        notes.push(`${file.name} 沒有讀出定位。`)
        continue
      }
      nextPoints.push(...parsed.points)
    }
    const result = clusterTracePoints(nextPoints, "timeline")
    setPoints(nextPoints)
    setStatus([result.summary, ...notes].filter(Boolean).join(" "))
    setReading(false)
  }

  async function add() {
    if (preview.fresh.length === 0 || saving) return
    setSaving(true)
    const imports: TraceImport[] = []
    for (const trip of preview.fresh) {
      const photos: TraceImport["photos"] = []
      if (keepPhotos) {
        for (const hit of selectHits(trip, hits)) {
          try {
            const blob = await compressImage(hit.file)
            const city = trip.stops.find((stop) => stop.city.id === hit.cityId)?.city.zh ?? ""
            photos.push({ blob, cityId: hit.cityId, caption: [city, hit.day].filter(Boolean).join(" ") })
          } catch {
            // 這張照片的格式讀不了，略過，旅程仍保留。
          }
        }
      }
      imports.push({ ...trip, photos })
    }
    onAdd(imports)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>從照片或定位找出旅程</DialogTitle>
          <DialogDescription>
            選手機相簿裡的照片，會依拍攝地點和日期整理成一趟趟。Google 地圖的時間軸可在 takeout.google.com 匯出「位置紀錄」，把 JSON 或 GPX 放進來也行。可以一次選很多個月。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <input
            id="trace-photos"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              void onPhotos(event.target.files)
              event.target.value = ""
            }}
          />
          <input
            id="trace-files"
            type="file"
            accept=".json,.gpx,.kml,.geojson,application/json,application/gpx+xml"
            multiple
            className="sr-only"
            onChange={(event) => {
              void onTracks(event.target.files)
              event.target.value = ""
            }}
          />
          <Button type="button" variant="outline" disabled={reading} onClick={() => document.getElementById("trace-photos")?.click()}>
            選擇手機照片
          </Button>
          <Button type="button" variant="outline" disabled={reading} onClick={() => document.getElementById("trace-files")?.click()}>
            選擇位置檔
          </Button>
        </div>
        {status ? (
          <div className="max-h-48 space-y-2 overflow-y-auto text-sm leading-6">
            <p>{status}</p>
            {preview.fresh.map((trip) => (
              <p key={`${trip.startDate}-${trip.title}-${trip.stops.map((stop) => stop.city.id).join(",")}`}>
                <span className="text-gold">{formatRange(trip.startDate, trip.endDate) || "日期待補"}</span>
                <span className="mx-2">{trip.title}</span>
                {trip.stays.length > 0 ? (
                  <span className="text-muted-foreground">{trip.stays.map((stay) => stay.name).join("、")}</span>
                ) : null}
              </p>
            ))}
            {preview.duplicates > 0 ? (
              <p className="text-muted-foreground">有 {preview.duplicates} 趟已經在列表裡，會略過。</p>
            ) : null}
            {hits.length > 0 ? (
              <label className="flex items-start gap-2 leading-5">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={keepPhotos}
                  onChange={(event) => setKeepPhotos(event.target.checked)}
                />
                一併留下照片（每趟最多 {MAX_PHOTOS} 張，存在這台瀏覽器）
                {keepPhotos && preview.photoCount > 0 ? `，這次約 ${preview.photoCount} 張` : ""}
              </label>
            ) : null}
          </div>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            拍照時若沒開定位，那張照片不會被算進來。日常待很久的城市會先拿掉，避免把住家當成一趟旅行。
          </p>
        )}
        <DialogFooter>
          <Button type="button" onClick={() => void add()} disabled={reading || saving || preview.fresh.length === 0}>
            {saving ? "加入中…" : preview.fresh.length > 0 ? `加入 ${preview.fresh.length} 趟` : "加入旅程"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function selectHits(trip: TraceDraft, hits: PhotoHit[]) {
  const chosen: PhotoHit[] = []
  const perCity = new Map<string, number>()
  const candidates = hits
    .filter((hit) => {
      if (!trip.stops.some((stop) => stop.city.id === hit.cityId)) return false
      if (!hit.day || !trip.startDate) return true
      return hit.day >= trip.startDate && hit.day <= (trip.endDate || trip.startDate)
    })
    .sort((a, b) => a.time - b.time)
  for (const hit of candidates) {
    if (chosen.length >= MAX_PHOTOS) break
    const used = perCity.get(hit.cityId) ?? 0
    if (used >= 2) continue
    perCity.set(hit.cityId, used + 1)
    chosen.push(hit)
  }
  return chosen
}
