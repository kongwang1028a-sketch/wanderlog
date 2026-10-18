"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, ClipboardPaste, ImagePlus, Link2, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { mergeCompanions, splitCompanionNames } from "@/lib/companions"
import { countryOptions, type City } from "@/lib/cities"
import { detectPhotoKind, isHttpUrl, photoKindLabel } from "@/lib/format"
import { nearestCity, searchCities, stopFromCity } from "@/lib/geo"
import { parseItinerary } from "@/lib/itinerary"
import { extractTripDetails } from "@/lib/lodging"
import { compressImage } from "@/lib/images"
import { getPhotoBlob } from "@/lib/storage"
import type { FlightRecord, PhotoRef, StayRecord, Stop, Trip } from "@/lib/types"

const MAX_UPLOADS = 24

const OUTLINE_PLACEHOLDER = `關西自由行
2024/11/2-11/7
11/2 大阪 道頓堀
11/4-11/5 京都 清水寺
11/6 奈良`

type PendingPhoto = {
  id: string
  blob: Blob
  preview: string
  caption: string
  stopId?: string
}

export function TripForm({
  initial,
  pendingPick,
  onConsumePick,
  onPickOnMap,
  onCancel,
  onSave,
}: {
  initial: Trip | null
  pendingPick: { lat: number; lng: number } | null
  onConsumePick: () => void
  onPickOnMap: () => void
  onCancel: () => void
  onSave: (
    trip: Trip,
    blobs: { id: string; blob: Blob }[],
    removedIds: string[],
  ) => Promise<void>
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [startDate, setStartDate] = useState(initial?.startDate ?? "")
  const [endDate, setEndDate] = useState(initial?.endDate ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [withGroup, setWithGroup] = useState(initial?.withGroup === true)
  const [companions, setCompanions] = useState<string[]>(initial?.companions ?? [])
  const [companionDraft, setCompanionDraft] = useState("")
  const [stops, setStops] = useState<Stop[]>(initial?.stops ?? [])
  const [flights, setFlights] = useState<FlightRecord[]>(initial?.flights ?? [])
  const [stays, setStays] = useState<StayRecord[]>(initial?.stays ?? [])
  const [photos, setPhotos] = useState<PhotoRef[]>(initial?.photos ?? [])
  const [pending, setPending] = useState<PendingPhoto[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [savedPreviews, setSavedPreviews] = useState<Record<string, string>>({})
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")
  const [outline, setOutline] = useState("")
  const [importSummary, setImportSummary] = useState("")
  const [unmatchedLines, setUnmatchedLines] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkCaption, setLinkCaption] = useState("")
  const [customName, setCustomName] = useState("")
  const [customCountry, setCustomCountry] = useState("JP")
  const fileRef = useRef<HTMLInputElement>(null)
  const previewUrls = useRef<string[]>([])
  const countries = useMemo(() => countryOptions(), [])
  const results = useMemo(() => searchCities(query), [query])
  const suggestion = pendingPick ? nearestCity(pendingPick.lat, pendingPick.lng, 35) : null

  useEffect(() => {
    let cancelled = false
    const created: string[] = []
    const uploads = (initial?.photos ?? []).filter((photo) => photo.kind === "upload")
    ;(async () => {
      const next: Record<string, string> = {}
      for (const photo of uploads) {
        const blob = await getPhotoBlob(photo.id)
        if (!blob || cancelled) continue
        const url = URL.createObjectURL(blob)
        created.push(url)
        next[photo.id] = url
      }
      if (!cancelled) setSavedPreviews(next)
    })()
    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [initial])

  useEffect(() => {
    const urls = previewUrls.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function addStop(stop: Stop) {
    if (stop.cityId && stops.some((item) => item.cityId === stop.cityId)) {
      setError(`${stop.name}已經在行程裡`)
      return
    }
    setStops((current) => [...current, stop])
    setError("")
  }

  function addCity(city: City) {
    addStop(stopFromCity(city))
    setQuery("")
  }

  function addCustom() {
    if (!pendingPick) return
    const name = customName.trim()
    if (!name) {
      setError("請為這個地點取一個名字")
      return
    }
    const country = countries.find((item) => item.code === customCountry)
    addStop({
      id: crypto.randomUUID(),
      name,
      country: country?.name ?? customCountry,
      countryCode: customCountry,
      lat: pendingPick.lat,
      lng: pendingPick.lng,
    })
    setCustomName("")
    onConsumePick()
  }

  function acceptSuggestion() {
    if (!suggestion) return
    addCity(suggestion)
    onConsumePick()
  }

  function moveStop(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= stops.length) return
    setStops((current) => {
      const next = current.slice()
      const [item] = next.splice(index, 1)
      if (!item) return current
      next.splice(target, 0, item)
      return next
    })
  }

  function removeStop(id: string) {
    setStops((current) => current.filter((stop) => stop.id !== id))
    setPhotos((current) =>
      current.map((photo) => (photo.stopId === id ? { ...photo, stopId: undefined } : photo)),
    )
    setPending((current) =>
      current.map((photo) => (photo.stopId === id ? { ...photo, stopId: undefined } : photo)),
    )
  }

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const used = photos.filter((photo) => photo.kind === "upload").length + pending.length
    const room = MAX_UPLOADS - used
    if (room <= 0) {
      setError(`一趟旅程最多上傳 ${MAX_UPLOADS} 張照片`)
      return
    }
    const files = [...list].slice(0, room)
    const next: PendingPhoto[] = []
    let failed = 0
    for (const file of files) {
      try {
        if (file.size > 25_000_000) {
          failed += 1
          continue
        }
        const blob = await compressImage(file)
        const preview = URL.createObjectURL(blob)
        previewUrls.current.push(preview)
        next.push({
          id: crypto.randomUUID(),
          blob,
          preview,
          caption: "",
        })
      } catch {
        failed += 1
      }
    }
    if (next.length > 0) setPending((current) => [...current, ...next])
    if (failed > 0) {
      setError("有些圖片讀取不到。HEIC 可以改存 JPG，或改貼 iCloud 分享連結。")
    } else {
      setError("")
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  function addLink() {
    const url = linkUrl.trim()
    if (!isHttpUrl(url)) {
      setError("請貼上以 http 或 https 開頭的分享連結")
      return
    }
    const kind = detectPhotoKind(url)
    setPhotos((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind,
        url,
        caption: linkCaption.trim(),
        addedAt: new Date().toISOString(),
      },
    ])
    setLinkUrl("")
    setLinkCaption("")
    setError("")
  }

  function removeSavedPhoto(photo: PhotoRef) {
    setPhotos((current) => current.filter((item) => item.id !== photo.id))
    if (photo.kind === "upload") setRemovedIds((current) => [...current, photo.id])
  }

  function removePending(id: string) {
    setPending((current) => current.filter((item) => item.id !== id))
  }

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) {
      setError("請寫下這趟旅程的名字")
      return
    }
    if (!startDate || !endDate) {
      setError("請填出發與回程日期")
      return
    }
    if (endDate < startDate) {
      setError("回程日期要在出發之後")
      return
    }
    if (stops.length === 0) {
      setError("至少加入一個停留點")
      return
    }
    setSaving(true)
    setError("")
    const trip: Trip = {
      id: initial?.id ?? crypto.randomUUID(),
      title: trimmed,
      startDate,
      endDate,
      notes: notes.trim(),
      withGroup,
      companions,
      stops,
      flights: flights
        .map((flight) => ({ ...flight, aircraft: flight.aircraft.trim(), route: flight.route.trim() }))
        .filter((flight) => flight.aircraft || flight.route),
      stays: stays
        .map((stay) => ({ ...stay, name: stay.name.trim() }))
        .filter((stay) => stay.name),
      photos: [
        ...photos,
        ...pending.map((photo) => ({
          id: photo.id,
          kind: "upload" as const,
          caption: photo.caption.trim(),
          stopId: photo.stopId,
          addedAt: new Date().toISOString(),
        })),
      ],
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    try {
      await onSave(
        trip,
        pending.map((photo) => ({ id: photo.id, blob: photo.blob })),
        removedIds,
      )
    } catch {
      setError("儲存失敗。若照片很多，試試減少幾張，或先匯出再清理。")
      setSaving(false)
    }
  }

  function addCompanions() {
    const incoming = splitCompanionNames(companionDraft)
    if (incoming.length === 0) return
    setCompanions((current) => mergeCompanions(current, incoming))
    setCompanionDraft("")
  }

  function applyOutline() {
    const text = outline.trim()
    if (!text) {
      setError("請先貼上行程大綱")
      setImportSummary("")
      setUnmatchedLines([])
      return
    }
    const parsed = parseItinerary(text)
    setUnmatchedLines(parsed.unmatched)
    if (parsed.stops.length === 0) {
      setImportSummary(parsed.summary)
      setError("")
      return
    }
    const hadStops = stops.length > 0
    if (!title.trim() && parsed.title) setTitle(parsed.title.slice(0, 60))
    if (parsed.startDate) setStartDate(parsed.startDate)
    if (parsed.endDate) setEndDate(parsed.endDate)
    setStops(parsed.stops.map((stop) => stopFromCity(stop.city, stop.date, stop.note)))
    const details = extractTripDetails(text)
    if (details.flights.length > 0) {
      setFlights((current) => {
        const keys = new Set(current.map((flight) => `${flight.aircraft}|${flight.route}`))
        const extra = details.flights
          .filter((flight) => !keys.has(`${flight.aircraft}|${flight.route}`))
          .map((flight) => ({ id: crypto.randomUUID(), aircraft: flight.aircraft, route: flight.route }))
        return [...current, ...extra]
      })
    }
    if (details.stays.length > 0) {
      setStays((current) => {
        const names = new Set(current.map((stay) => stay.name))
        const extra = details.stays
          .filter((stay) => !names.has(stay.name))
          .map((stay) => ({ id: crypto.randomUUID(), name: stay.name }))
        return [...current, ...extra]
      })
    }
    if (!notes.trim()) setNotes(text.slice(0, 2000))
    const replaced = hadStops ? "原本的停留點已換成這份大綱。" : ""
    const noted = [
      details.stays.length > 0 ? `${details.stays.length} 間旅館` : "",
      details.flights.length > 0 ? `${details.flights.length} 個航班` : "",
    ].filter(Boolean)
    const extra = noted.length > 0 ? `已填上${noted.join("、")}，機型可以再補。` : ""
    setImportSummary([parsed.summary, replaced, extra].filter(Boolean).join("。"))
    setError("")
  }

  function requestCancel() {
    const dirty =
      title.trim() !== (initial?.title ?? "") ||
      stops.length !== (initial?.stops.length ?? 0) ||
      pending.length > 0 ||
      notes.trim() !== (initial?.notes ?? "") ||
      JSON.stringify(flights) !== JSON.stringify(initial?.flights ?? []) ||
      JSON.stringify(stays) !== JSON.stringify(initial?.stays ?? []) ||
      outline.trim() !== ""
    if (dirty && !window.confirm("放棄這次編輯？")) return
    onCancel()
  }

  const uploadCount = photos.filter((photo) => photo.kind === "upload").length + pending.length

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs tracking-wide text-gold">{initial ? "修改紀錄" : "新的足跡"}</p>
          <h2 className="font-display text-2xl">{initial ? "編輯旅程" : "新增旅程"}</h2>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="關閉編輯" onClick={requestCancel}>
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <section className="space-y-2 rounded-2xl border border-gold/40 bg-[#f8f1e4] p-3">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="size-4 text-gold" />
            <Label htmlFor="trip-outline">貼上行程大綱</Label>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            整段貼上即可。有每天行程的表會讀出日期、城市、旅館和航班編號。年份清單或手機照片，用旅程列表上的匯入。
          </p>
          <Textarea
            id="trip-outline"
            value={outline}
            maxLength={20000}
            placeholder={OUTLINE_PLACEHOLDER}
            className="min-h-36 bg-card"
            onChange={(event) => setOutline(event.target.value)}
          />
          <Button type="button" variant="secondary" className="w-full" onClick={applyOutline}>
            分析並匯入
          </Button>
          {(importSummary || unmatchedLines.length > 0) && (
            <div className="rounded-xl bg-card px-3 py-2 text-sm leading-6">
              {importSummary && <p>{importSummary}</p>}
              {unmatchedLines.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs leading-5 text-muted-foreground">
                  {unmatchedLines.map((line, index) => (
                    <li key={`${index}-${line}`}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
        <div className="space-y-2">
          <Label htmlFor="trip-title">旅程名稱</Label>
          <Input
            id="trip-title"
            value={title}
            maxLength={60}
            placeholder="例如：關西的楓與鹿"
            className="h-10 bg-card"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="trip-start">出發</Label>
            <Input
              id="trip-start"
              type="date"
              value={startDate}
              className="h-10 bg-card"
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trip-end">回程</Label>
            <Input
              id="trip-end"
              type="date"
              value={endDate}
              className="h-10 bg-card"
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <section className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <Label htmlFor="city-search">行程停留點</Label>
            <button type="button" className="text-xs text-sea underline-offset-2 hover:underline" onClick={onPickOnMap}>
              改在地圖上選
            </button>
          </div>
          <Input
            id="city-search"
            value={query}
            placeholder="搜尋城市，例如京都、Paris"
            className="h-10 bg-card"
            onChange={(event) => setQuery(event.target.value)}
          />
          {results.length > 0 && (
            <ul className="overflow-hidden rounded-2xl border bg-card">
              {results.map((city) => (
                <li key={city.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-secondary"
                    onClick={() => addCity(city)}
                  >
                    <span>
                      {city.zh}
                      <span className="ml-2 text-xs text-muted-foreground">{city.en}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{city.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pendingPick && (
            <div className="rounded-2xl border border-sea/30 bg-[#e7f3f1] p-3">
              <p className="text-sm font-medium">地圖上的這個位置</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pendingPick.lat.toFixed(3)}, {pendingPick.lng.toFixed(3)}
              </p>
              {suggestion && (
                <Button type="button" className="mt-3 w-full" onClick={acceptSuggestion}>
                  加入{suggestion.zh}
                </Button>
              )}
              <div className="mt-3 grid gap-2">
                <Input
                  value={customName}
                  placeholder="或自訂地名"
                  className="h-10 bg-card"
                  onChange={(event) => setCustomName(event.target.value)}
                />
                <select
                  aria-label="國家或地區"
                  value={customCountry}
                  className="h-10 rounded-lg border bg-card px-2.5 text-sm"
                  onChange={(event) => setCustomCountry(event.target.value)}
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={addCustom}>
                  加入自訂地點
                </Button>
              </div>
            </div>
          )}

          {stops.length === 0 ? (
            <p className="rounded-2xl bg-secondary px-3 py-3 text-sm leading-6 text-muted-foreground">
              依造訪順序加入城市，或先在上方貼上整段行程。桌面版可以直接點地圖；手機請按「改在地圖上選」。
            </p>
          ) : (
            <ol className="space-y-2">
              {stops.map((stop, index) => (
                <li key={stop.id} className="rounded-2xl border bg-card p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-sea text-xs text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {stop.name}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{stop.country}</span>
                      </p>
                      <div className="mt-2 grid gap-2">
                        <Input
                          type="date"
                          aria-label={`${stop.name}的日期`}
                          value={stop.date ?? ""}
                          className="h-9 bg-background"
                          onChange={(event) =>
                            setStops((current) =>
                              current.map((item) =>
                                item.id === stop.id ? { ...item, date: event.target.value } : item,
                              ),
                            )
                          }
                        />
                        <Input
                          aria-label={`${stop.name}的備註`}
                          value={stop.note ?? ""}
                          placeholder="這站想記住的事"
                          className="h-9 bg-background"
                          onChange={(event) =>
                            setStops((current) =>
                              current.map((item) =>
                                item.id === stop.id ? { ...item, note: event.target.value } : item,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="上移" onClick={() => moveStop(index, -1)}>
                        <ChevronUp />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="下移" onClick={() => moveStop(index, 1)}>
                        <ChevronDown />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="移除停留點" onClick={() => removeStop(stop.id)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="font-medium">班機</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">機型例如波音 787、A350。航段可以寫航班編號或城市。</p>
          </div>
          {flights.map((flight) => (
            <div key={flight.id} className="flex gap-2">
              <Input
                aria-label="機型"
                value={flight.aircraft}
                placeholder="機型"
                className="h-9 bg-card"
                onChange={(event) =>
                  setFlights((current) =>
                    current.map((item) => (item.id === flight.id ? { ...item, aircraft: event.target.value } : item)),
                  )
                }
              />
              <Input
                aria-label="航段"
                value={flight.route}
                placeholder="航段"
                className="h-9 bg-card"
                onChange={(event) =>
                  setFlights((current) =>
                    current.map((item) => (item.id === flight.id ? { ...item, route: event.target.value } : item)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="移除班機"
                onClick={() => setFlights((current) => current.filter((item) => item.id !== flight.id))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setFlights((current) => [...current, { id: crypto.randomUUID(), aircraft: "", route: "" }])}
          >
            <Plus />
            加入班機
          </Button>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="font-medium">住宿</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">寫下旅館名稱，並選它在哪一個城市。</p>
          </div>
          {stays.map((stay) => (
            <div key={stay.id} className="flex gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  aria-label="旅館名稱"
                  value={stay.name}
                  placeholder="旅館名稱"
                  className="h-9 bg-card"
                  onChange={(event) =>
                    setStays((current) =>
                      current.map((item) => (item.id === stay.id ? { ...item, name: event.target.value } : item)),
                    )
                  }
                />
                <StopSelect
                  label="旅館在"
                  stops={stops}
                  value={stay.stopId}
                  onChange={(stopId) =>
                    setStays((current) => current.map((item) => (item.id === stay.id ? { ...item, stopId } : item)))
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="移除旅館"
                onClick={() => setStays((current) => current.filter((item) => item.id !== stay.id))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setStays((current) => [...current, { id: crypto.randomUUID(), name: "" }])}
          >
            <Plus />
            加入旅館
          </Button>
        </section>

        <section className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-terracotta"
              checked={withGroup}
              onChange={(event) => setWithGroup(event.target.checked)}
            />
            這趟跟旅行團
          </label>
          <div className="space-y-2">
            <Label htmlFor="companion-name">同行朋友</Label>
            <div className="flex gap-2">
              <Input
                id="companion-name"
                value={companionDraft}
                placeholder="輸入綽號，多個人用頓號分開"
                className="h-9 bg-card"
                onChange={(event) => setCompanionDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    addCompanions()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addCompanions}>
                加入
              </Button>
            </div>
            {companions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {companions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="rounded-full bg-secondary px-3 py-1 text-xs"
                    onClick={() => setCompanions((current) => current.filter((item) => item !== name))}
                  >
                    {name} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-2">
          <Label htmlFor="trip-notes">旅程備註</Label>
          <Textarea
            id="trip-notes"
            value={notes}
            maxLength={2000}
            placeholder="天氣、同伴、下次想改的路線…"
            className="min-h-24 bg-card"
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="font-medium">照片</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              上傳的照片只存在這台瀏覽器。Google 雲端與 iCloud 請貼分享連結，之後從這裡打開相簿。已選 {uploadCount}/{MAX_UPLOADS} 張。
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => void onFiles(event.target.files)}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <ImagePlus />
            上傳照片
          </Button>
          {(photos.length > 0 || pending.length > 0) && (
            <ul className="space-y-2">
              {photos.map((photo) => (
                <li key={photo.id} className="rounded-2xl border bg-card p-2">
                  <div className="flex gap-2">
                    {photo.kind === "upload" && savedPreviews[photo.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={savedPreviews[photo.id]} alt="" className="size-16 rounded-xl object-cover" />
                    ) : (
                      <span className="flex size-16 items-center justify-center rounded-xl bg-secondary text-[10px] text-muted-foreground">
                        {photoKindLabel(photo.kind)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        aria-label="照片說明"
                        value={photo.caption}
                        placeholder="說明"
                        className="h-8 bg-background"
                        onChange={(event) =>
                          setPhotos((current) =>
                            current.map((item) =>
                              item.id === photo.id ? { ...item, caption: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <StopSelect
                        stops={stops}
                        value={photo.stopId}
                        onChange={(stopId) =>
                          setPhotos((current) =>
                            current.map((item) => (item.id === photo.id ? { ...item, stopId } : item)),
                          )
                        }
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="移除照片" onClick={() => removeSavedPhoto(photo)}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
              {pending.map((photo) => (
                <li key={photo.id} className="rounded-2xl border bg-card p-2">
                  <div className="flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.preview} alt="" className="size-16 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        aria-label="新照片說明"
                        value={photo.caption}
                        placeholder="說明"
                        className="h-8 bg-background"
                        onChange={(event) =>
                          setPending((current) =>
                            current.map((item) =>
                              item.id === photo.id ? { ...item, caption: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <StopSelect
                        stops={stops}
                        value={photo.stopId}
                        onChange={(stopId) =>
                          setPending((current) =>
                            current.map((item) => (item.id === photo.id ? { ...item, stopId } : item)),
                          )
                        }
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="移除新照片" onClick={() => removePending(photo.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-2xl border bg-card p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Link2 className="size-4" />
              Google 雲端或 iCloud 連結
            </p>
            <div className="mt-2 space-y-2">
              <Input
                value={linkUrl}
                placeholder="貼上分享連結"
                className="h-10 bg-background"
                onChange={(event) => setLinkUrl(event.target.value)}
              />
              <Input
                value={linkCaption}
                placeholder="這組照片的說明"
                className="h-10 bg-background"
                onChange={(event) => setLinkCaption(event.target.value)}
              />
              <Button type="button" variant="secondary" onClick={addLink}>
                加入連結
              </Button>
            </div>
          </div>
        </section>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="flex gap-2 border-t bg-card px-4 py-3">
        <Button type="button" variant="outline" className="flex-1" onClick={requestCancel}>
          取消
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "儲存中…" : "儲存旅程"}
        </Button>
      </div>
    </form>
  )
}

function StopSelect({
  stops,
  value,
  onChange,
  label = "照片屬於",
}: {
  stops: Stop[]
  value?: string
  onChange: (stopId: string | undefined) => void
  label?: string
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      className="h-8 w-full rounded-lg border bg-background px-2 text-xs"
      onChange={(event) => onChange(event.target.value || undefined)}
    >
      <option value="">整趟旅程</option>
      {stops.map((stop) => (
        <option key={stop.id} value={stop.id}>
          {stop.name}
        </option>
      ))}
    </select>
  )
}
