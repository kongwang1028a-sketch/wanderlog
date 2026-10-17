"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Download, Flag, ListPlus, LocateFixed, Map as MapIcon, Plus, Share2, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DetailPanel } from "@/components/detail-panel"
import { MemoryImportDialog } from "@/components/memory-import"
import { TraceImportDialog, type TraceImport } from "@/components/trace-import"
import { TripForm } from "@/components/trip-form"
import type { Camera, RouteStop } from "@/components/world-map"
import { createDemoTrips } from "@/lib/demo"
import { formatRange, isWholeMonth, isWholeYear, totalTravelDays } from "@/lib/format"
import { blobToDataUrl } from "@/lib/images"
import {
  buildPins,
  flagEmoji,
  placeKey,
  stopFromCity,
  uniqueCountries,
  uniquePlaces,
} from "@/lib/geo"
import {
  applyPublishedFootprints,
  createBook,
  deletePhotoBlob,
  getBookSnapshot,
  getPhotoBlob,
  getServerBookSnapshot,
  getServerTripSnapshot,
  getTripSnapshot,
  importBundle,
  isTrip,
  peekAuroraFocus,
  removeBook,
  savePhotoBlob,
  subscribeBooks,
  subscribeTrips,
  switchBook,
  updateTrips,
  type FootprintBook,
} from "@/lib/storage"
import type { MemoryTrip } from "@/lib/memory-list"
import type { ExportBundle, PhotoRef, Stop, Trip } from "@/lib/types"
import { cn } from "@/lib/utils"

const WorldMap = dynamic(() => import("@/components/world-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#d5e3ea] text-sm text-[#3f342c]">
      地圖載入中…
    </div>
  ),
})

type Editor = "new" | string | null
type MobileView = "map" | "list" | "form"
type ConfirmState = {
  title: string
  body: string
  confirmLabel: string
  action: () => void
}

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia("(min-width: 768px)")
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function desktopSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false)
}

export function TravelApp() {
  const snapshot = useSyncExternalStore(subscribeTrips, getTripSnapshot, getServerTripSnapshot)
  const bookStore = useSyncExternalStore(subscribeBooks, getBookSnapshot, getServerBookSnapshot)
  const trips = snapshot.trips
  const activeBook = bookStore.books.find((book) => book.id === bookStore.activeId) ?? bookStore.books[0]
  const bookName = activeBook?.name ?? "我的足跡"
  const ready = snapshot.ready
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [focusStopId, setFocusStopId] = useState<string | null>(null)
  const [selectedPinKey, setSelectedPinKey] = useState<string | null>(null)
  const [editor, setEditor] = useState<Editor>(null)
  const [mobileView, setMobileView] = useState<MobileView>("map")
  const [pendingPick, setPendingPick] = useState<{ lat: number; lng: number } | null>(null)
  const [year, setYear] = useState("all")
  const [query, setQuery] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [traceOpen, setTraceOpen] = useState(false)
  const [bookNameDraft, setBookNameDraft] = useState("")
  const [camera, setCamera] = useState<Camera>({ kind: "idle" })
  const desktop = useIsDesktop()
  const toastTimer = useRef<number | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const cameraSeq = useRef(0)
  const [handledAuroraFocus, setHandledAuroraFocus] = useState<string | null>(null)

  function cameraToken(prefix: string) {
    cameraSeq.current += 1
    return `${prefix}:${cameraSeq.current}`
  }

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    void fetch(`${base}/data/footprints.json?v=2019-feb`)
      .then((response) => {
        if (!response.ok) return null
        return response.json() as Promise<Partial<ExportBundle>>
      })
      .then(async (parsed) => {
        if (!parsed || !Array.isArray(parsed.trips)) return
        await applyPublishedFootprints({
          version: 1,
          exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "published",
          trips: parsed.trips.filter(isTrip),
          photos: Array.isArray(parsed.photos) ? parsed.photos : [],
        })
      })
      .catch(() => {
        // The map still works from this browser when the public file is missing.
      })
  }, [])

  useEffect(() => {
    if (!toast?.startsWith("已放上")) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || editor) return
      setSelectedTripId(null)
      setSelectedPinKey(null)
      setFocusStopId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [editor])

  function resetView() {
    setSelectedTripId(null)
    setFocusStopId(null)
    setSelectedPinKey(null)
    setEditor(null)
    setPendingPick(null)
    setYear("all")
    setQuery("")
    setCamera({ kind: "idle" })
    setMobileView("map")
  }

  function openBook(id: string) {
    switchBook(id)
    resetView()
  }

  function addBook() {
    const created = createBook(bookNameDraft)
    if (!created) return
    setBookNameDraft("")
    resetView()
    notify(`已換成「${created.name}」，這本是空白的`)
  }

  async function deleteBook(id: string) {
    const removed = removeBook(id)
    for (const trip of removed) {
      for (const photo of trip.photos) {
        if (photo.kind === "upload") await deletePhotoBlob(photo.id)
      }
    }
    resetView()
  }

  function askRemoveBook(book: FootprintBook) {
    setShareOpen(false)
    setConfirm({
      title: `刪除「${book.name}」的紀錄？`,
      body: "這個足跡本裡的旅程會從這台裝置移除。其他足跡本不受影響。",
      confirmLabel: "刪除",
      action: () => {
        void deleteBook(book.id)
      },
    })
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      notify("已複製網址")
    } catch {
      notify("無法複製，請手動選取網址")
    }
  }

  function notify(message: string) {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }

  const years = useMemo(
    () => [...new Set(trips.map((trip) => trip.startDate.slice(0, 4)).filter(Boolean))].sort().reverse(),
    [trips],
  )

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return trips
      .filter((trip) => (year === "all" ? true : trip.startDate.startsWith(year)))
      .filter((trip) => {
        if (!lowered) return true
        const haystack = [
          trip.title,
          trip.notes,
          ...trip.stops.flatMap((stop) => [stop.name, stop.country, stop.note ?? ""]),
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(lowered)
      })
      .slice()
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [trips, year, query])

  const pins = useMemo(() => buildPins(filtered), [filtered])
  const selectedTrip = filtered.find((trip) => trip.id === selectedTripId) ?? null
  const selectedPin = pins.find((pin) => pin.key === selectedPinKey) ?? null
  const editingTrip = editor && editor !== "new" ? (trips.find((trip) => trip.id === editor) ?? null) : null
  const countryCount = uniqueCountries(filtered).length
  const placeCount = uniquePlaces(filtered)
  const dayCount = totalTravelDays(filtered)

  const routeStops: RouteStop[] = selectedTrip
    ? selectedTrip.stops.map((stop, index) => ({
        id: stop.id,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        index: index + 1,
        active: stop.id === (focusStopId ?? selectedTrip.stops[0]?.id),
      }))
    : []

  const pickEnabled = editor !== null && (desktop || mobileView === "map")
  const showAside = editor
    ? mobileView === "form" || desktop
    : mobileView === "list" || desktop
  const showMap = !showAside || desktop || mobileView === "map"
  const panelOpen = editor === null && (selectedTrip !== null || (selectedPin !== null && !selectedTrip))

  function panelFrame() {
    if (desktop) return { padRight: 460, padBottom: 88, offsetX: 190, offsetY: 0, maxZoom: 8 }
    return { padRight: 28, padBottom: 340, offsetX: 0, offsetY: -150, maxZoom: 8 }
  }

  function openTrip(tripId: string, stopId?: string, fit = true) {
    const trip = trips.find((item) => item.id === tripId)
    if (!trip) return
    setEditor(null)
    setSelectedTripId(trip.id)
    setFocusStopId(stopId ?? trip.stops[0]?.id ?? null)
    setSelectedPinKey(stopId ? placeKey(trip.stops.find((stop) => stop.id === stopId) ?? trip.stops[0]!) : null)
    setMobileView("map")
    if (fit) {
      setCamera({
        kind: "bounds",
        token: cameraToken(trip.id),
        points: trip.stops.map((stop) => [stop.lat, stop.lng]),
        ...panelFrame(),
      })
    }
  }

  function focusStop(stop: Stop) {
    setFocusStopId(stop.id)
    setSelectedPinKey(placeKey(stop))
    const frame = panelFrame()
    setCamera({
      kind: "fly",
      token: cameraToken(stop.id),
      lat: stop.lat,
      lng: stop.lng,
      zoom: 8,
      offsetX: frame.offsetX,
      offsetY: frame.offsetY,
    })
    setMobileView("map")
  }

  function startCreate() {
    setEditor("new")
    setSelectedTripId(null)
    setSelectedPinKey(null)
    setFocusStopId(null)
    setPendingPick(null)
    setMobileView("form")
  }

  function startEdit(tripId: string) {
    setEditor(tripId)
    setPendingPick(null)
    setMobileView("form")
  }

  async function handleSave(
    trip: Trip,
    blobs: { id: string; blob: Blob }[],
    removedIds: string[],
  ) {
    for (const id of removedIds) await deletePhotoBlob(id)
    for (const item of blobs) await savePhotoBlob(item.id, item.blob)
    updateTrips((current) => {
      const index = current.findIndex((item) => item.id === trip.id)
      if (index === -1) return [trip, ...current]
      const next = current.slice()
      next[index] = trip
      return next
    })
    setEditor(null)
    setPendingPick(null)
    setYear("all")
    setQuery("")
    setSelectedTripId(trip.id)
    setFocusStopId(trip.stops[0]?.id ?? null)
    setMobileView("map")
    setCamera({
      kind: "bounds",
      token: cameraToken(`saved:${trip.id}`),
      points: trip.stops.map((stop) => [stop.lat, stop.lng]),
      ...panelFrame(),
    })
    notify("已記下這趟旅程")
  }

  function askDelete(trip: Trip) {
    setConfirm({
      title: "刪除這趟旅程？",
      body: `「${trip.title}」和它上傳的照片會從這台瀏覽器移除。雲端連結只是網址，不會刪到 Google 或 iCloud 裡的檔案。`,
      confirmLabel: "刪除",
      action: () => {
        void (async () => {
          for (const photo of trip.photos) {
            if (photo.kind === "upload") await deletePhotoBlob(photo.id)
          }
          updateTrips((current) => current.filter((item) => item.id !== trip.id))
          if (selectedTripId === trip.id) {
            setSelectedTripId(null)
            setFocusStopId(null)
            setSelectedPinKey(null)
          }
          notify("已刪除旅程")
        })()
      },
    })
  }

  function addMemories(drafts: MemoryTrip[]) {
    const createdAt = new Date().toISOString()
    const created = drafts.map((draft) => {
      const approximate = isWholeYear(draft.startDate, draft.endDate) || isWholeMonth(draft.startDate, draft.endDate)
      return {
        id: crypto.randomUUID(),
        title: draft.title,
        startDate: draft.startDate,
        endDate: draft.endDate,
        notes: "",
        stops: draft.cities.map((city) => stopFromCity(city, approximate || !draft.startDate ? undefined : draft.startDate)),
        flights: [],
        stays: [],
        photos: [],
        createdAt,
      }
    })
    updateTrips((current) => [...created, ...current])
    setMemoryOpen(false)
    setYear("all")
    setQuery("")
    setEditor(null)
    setSelectedTripId(created[0]?.id ?? null)
    setFocusStopId(created[0]?.stops[0]?.id ?? null)
    setSelectedPinKey(null)
    setMobileView("map")
    const points = created.flatMap((trip) => trip.stops.map((stop) => [stop.lat, stop.lng] as [number, number]))
    if (points.length > 0) {
      setCamera({
        kind: "bounds",
        token: cameraToken("memory"),
        points,
        padRight: desktop ? 460 : 28,
        padBottom: desktop ? 88 : 120,
        maxZoom: 4,
      })
    }
    notify(`已加入 ${created.length} 趟旅程`)
  }

  async function addTraces(drafts: TraceImport[]) {
    const createdAt = new Date().toISOString()
    const created: Trip[] = []
    for (const draft of drafts) {
      const stops = draft.stops.map((stop) => stopFromCity(stop.city, stop.day))
      const photos: PhotoRef[] = []
      for (const photo of draft.photos) {
        const id = crypto.randomUUID()
        await savePhotoBlob(id, photo.blob)
        photos.push({
          id,
          kind: "upload" as const,
          caption: photo.caption,
          stopId: stops.find((stop) => stop.cityId === photo.cityId)?.id,
          addedAt: createdAt,
        })
      }
      created.push({
        id: crypto.randomUUID(),
        title: draft.title,
        startDate: draft.startDate,
        endDate: draft.endDate,
        notes: "",
        stops,
        flights: [],
        stays: draft.stays.map((stay) => ({
          id: crypto.randomUUID(),
          name: stay.name,
          stopId: stops.find((stop) => stop.cityId === stay.cityId)?.id,
        })),
        photos,
        createdAt,
      })
    }
    updateTrips((current) => [...created, ...current])
    setTraceOpen(false)
    setYear("all")
    setQuery("")
    setEditor(null)
    setSelectedTripId(created[0]?.id ?? null)
    setFocusStopId(created[0]?.stops[0]?.id ?? null)
    setSelectedPinKey(null)
    setMobileView("map")
    const points = created.flatMap((trip) => trip.stops.map((stop) => [stop.lat, stop.lng] as [number, number]))
    if (points.length > 0) {
      setCamera({
        kind: "bounds",
        token: cameraToken("trace"),
        points,
        padRight: desktop ? 460 : 28,
        padBottom: desktop ? 88 : 120,
        maxZoom: 4,
      })
    }
    const photoCount = created.reduce((total, trip) => total + trip.photos.length, 0)
    notify(photoCount > 0 ? `已加入 ${created.length} 趟旅程，並留下 ${photoCount} 張照片` : `已加入 ${created.length} 趟旅程`)
  }

  function addDemo() {
    const existing = new Set(trips.map((trip) => trip.id))
    const fresh = createDemoTrips().filter((trip) => !existing.has(trip.id))
    if (fresh.length === 0) {
      notify("示範旅程已經在列表裡")
      return
    }
    updateTrips((current) => [...fresh, ...current])
    setMobileView("map")
    const first = fresh[0]
    if (first) {
      setSelectedTripId(first.id)
      setFocusStopId(first.stops[0]?.id ?? null)
      setCamera({
        kind: "bounds",
        token: `demo:${first.id}`,
        points: first.stops.map((stop) => [stop.lat, stop.lng]),
        ...panelFrame(),
      })
    }
    notify("已放入兩段示範旅程，可以改掉或刪除")
  }

  async function bundleTrips(): Promise<ExportBundle> {
    const photos: ExportBundle["photos"] = []
    for (const trip of trips) {
      for (const photo of trip.photos) {
        if (photo.kind !== "upload") continue
        const blob = await getPhotoBlob(photo.id)
        if (!blob) continue
        photos.push({ id: photo.id, dataUrl: await blobToDataUrl(blob) })
      }
    }
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      trips,
      photos,
    }
  }

  function downloadJson(bundle: ExportBundle, filename: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function exportTrips() {
    notify("正在打包足跡…")
    downloadJson(await bundleTrips(), "旅遊足跡.json")
    notify("已匯出旅遊足跡.json")
  }

  async function downloadPublicFootprints() {
    notify("正在打包足跡…")
    downloadJson(await bundleTrips(), "footprints.json")
    notify("已下載 footprints.json。放到專案的 public/data/ 再推送，別人就能看到。")
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!parsed || typeof parsed !== "object" || !("trips" in parsed)) {
        throw new Error("format")
      }
      const record = parsed as Partial<ExportBundle>
      if (!Array.isArray(record.trips)) throw new Error("format")
      const incoming = await importBundle({
        version: 1,
        exportedAt: record.exportedAt ?? new Date().toISOString(),
        trips: record.trips.filter(isTrip),
        photos: Array.isArray(record.photos) ? record.photos : [],
      })
      if (incoming.length === 0) {
        notify("檔案裡沒有可匯入的旅程")
        return
      }
      updateTrips((current) => {
        const ids = new Set(current.map((trip) => trip.id))
        return [...incoming.filter((trip) => !ids.has(trip.id)), ...current]
      })
      notify(`已匯入 ${incoming.length} 趟旅程`)
    } catch {
      notify("這個檔案不是旅遊足跡的匯出檔")
    } finally {
      if (importRef.current) importRef.current.value = ""
    }
  }

  function showAll() {
    if (pins.length === 0) return
    setSelectedTripId(null)
    setSelectedPinKey(null)
    setFocusStopId(null)
    setCamera({
      kind: "bounds",
      token: cameraToken("all"),
      points: pins.map((pin) => [pin.lat, pin.lng]),
      padRight: desktop ? 80 : 28,
      padBottom: 80,
      maxZoom: 4,
    })
    setMobileView("map")
  }

  const auroraFocusId = peekAuroraFocus()
  if (ready && auroraFocusId && handledAuroraFocus !== auroraFocusId) {
    const aurora = trips.find((trip) => trip.id === auroraFocusId)
    if (aurora) {
      setHandledAuroraFocus(auroraFocusId)
      setYear("all")
      setQuery("")
      setEditor(null)
      setSelectedTripId(aurora.id)
      setFocusStopId(aurora.stops[0]?.id ?? null)
      setSelectedPinKey(null)
      setMobileView("map")
      setCamera({
        kind: "bounds",
        token: `aurora-focus:${aurora.id}`,
        points: aurora.stops.map((stop) => [stop.lat, stop.lng]),
        ...panelFrame(),
      })
      setToast(`已放上${aurora.title}`)
    }
  }

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        正在展開地圖…
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="z-30 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-terracotta text-lg text-white">
            <Flag className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl leading-none">旅遊足跡</h1>
            <p className="mt-1 max-w-[9rem] truncate text-xs text-muted-foreground sm:max-w-none">{bookName}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="icon" className="sm:hidden" aria-label="分享給朋友" onClick={() => setShareOpen(true)}>
              <Share2 />
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setShareOpen(true)}>
              <Share2 />
              分享
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden" aria-label="匯入" onClick={() => importRef.current?.click()}>
              <Upload />
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden" aria-label="匯出" onClick={() => void exportTrips()}>
              <Download />
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => importRef.current?.click()}>
              <Upload />
              匯入
            </Button>
            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => void exportTrips()}>
              <Download />
              匯出
            </Button>
            <Button onClick={startCreate}>
              <Plus />
              <span className="hidden sm:inline">新增旅程</span>
              <span className="sm:hidden">新增</span>
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Stat label="國家" value={countryCount} />
          <Stat label="城市" value={placeCount} />
          <Stat label="旅程" value={filtered.length} />
          <Stat label="天數" value={dayCount} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-r bg-background md:flex md:w-[400px] md:shrink-0",
            showAside ? "flex" : "hidden",
          )}
        >
          {editor !== null ? (
            <TripForm
              key={editor}
              initial={editor === "new" ? null : editingTrip}
              pendingPick={pendingPick}
              onConsumePick={() => setPendingPick(null)}
              onPickOnMap={() => {
                setMobileView("map")
                notify("在地圖上點一個位置")
              }}
              onCancel={() => {
                setEditor(null)
                setPendingPick(null)
                setMobileView(desktop ? "map" : "list")
              }}
              onSave={handleSave}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="space-y-3 px-4 py-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜尋旅程、城市"
                  className="h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/40"
                />
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <FilterChip active={year === "all"} onClick={() => setYear("all")}>
                    全部
                  </FilterChip>
                  {years.map((item) => (
                    <FilterChip key={item} active={year === item} onClick={() => setYear(item)}>
                      {item}
                    </FilterChip>
                  ))}
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={() => setMemoryOpen(true)}>
                  <ListPlus />
                  一次補上很多趟
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setTraceOpen(true)}>
                  <LocateFixed />
                  從照片或定位找出旅程
                </Button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
                {filtered.length === 0 ? (
                  <div className="rounded-3xl border border-dashed bg-card px-4 py-8 text-center">
                    <p className="font-display text-2xl">地圖還是空白的</p>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                      加一趟旅程，到過的地方就會升起旗幟。過去的旅行可以一次貼上年份和城市，或從手機照片的定位整理出來。
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button onClick={startCreate}>新增第一趟旅程</Button>
                      <Button variant="outline" onClick={addDemo}>
                        放入示範足跡
                      </Button>
                    </div>
                  </div>
                ) : (
                  filtered.map((trip) => {
                    const active = trip.id === selectedTripId
                    const codes = [...new Set(trip.stops.map((stop) => stop.countryCode))]
                    return (
                      <article
                        key={trip.id}
                        className={cn(
                          "rounded-3xl border bg-card p-3",
                          active && "border-terracotta/60 bg-[#fff8f4]",
                        )}
                      >
                        <button type="button" className="w-full text-left" onClick={() => openTrip(trip.id)}>
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-display text-xl leading-tight">{trip.title}</span>
                            <span className="shrink-0 text-xs text-gold">{trip.startDate.slice(0, 4)}</span>
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {formatRange(trip.startDate, trip.endDate)}
                          </span>
                          <span className="mt-2 block text-sm leading-6">
                            {trip.stops.map((stop) => stop.name).join(" → ") || "尚未安排停留"}
                          </span>
                          <span className="mt-2 flex items-center gap-2 text-base">
                            <span>{codes.map((code) => flagEmoji(code)).join(" ")}</span>
                            {trip.photos.length > 0 && (
                              <Badge variant="secondary">{trip.photos.length} 張照片或連結</Badge>
                            )}
                            {trip.flights.length > 0 && (
                              <Badge variant="secondary">
                                {trip.flights
                                  .map((flight) => flight.aircraft || flight.route)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .join("、")}
                              </Badge>
                            )}
                            {trip.stays.length > 0 && <Badge variant="secondary">{trip.stays.length} 間旅館</Badge>}
                          </span>
                        </button>
                        <div className="mt-2 flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(trip.id)}>
                            編輯
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => askDelete(trip)}>
                            刪除
                          </Button>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </aside>

        <main className={cn("relative min-h-0 min-w-0 flex-1", showMap ? "block" : "hidden md:block")}>
          <WorldMap
            pins={pins}
            activePinKey={selectedPinKey}
            routeStops={routeStops}
            pickEnabled={pickEnabled}
            camera={camera}
            onPinClick={(key) => {
              const pin = pins.find((item) => item.key === key)
              if (!pin) return
              setSelectedPinKey(key)
              setEditor(null)
              if (pin.visits.length === 1) {
                const visit = pin.visits[0]
                if (visit) openTrip(visit.tripId, visit.stopId)
                return
              }
              setSelectedTripId(null)
              setFocusStopId(null)
              setMobileView("map")
              const frame = panelFrame()
              setCamera({
                kind: "fly",
                token: cameraToken(`pin:${key}`),
                lat: pin.lat,
                lng: pin.lng,
                zoom: 5,
                offsetX: frame.offsetX,
                offsetY: frame.offsetY,
              })
            }}
            onRouteStopClick={(id) => {
              const stop = selectedTrip?.stops.find((item) => item.id === id)
              if (stop) focusStop(stop)
            }}
            onPick={(lat, lng) => {
              setPendingPick({ lat, lng })
              if (!desktop) setMobileView("form")
              notify("已選到一個位置，確認要加入哪個城市")
            }}
          />

          <div className="pointer-events-none absolute inset-0 z-10">
            {pickEnabled && (
              <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
                <p className="rounded-full bg-sea px-4 py-2 text-sm text-white shadow-lg">
                  點地圖加入停留點
                </p>
              </div>
            )}
            {editor !== null && !desktop && mobileView === "map" && (
              <div className="pointer-events-auto absolute inset-x-3 bottom-3">
                <Button className="w-full" variant="secondary" onClick={() => setMobileView("form")}>
                  返回編輯旅程
                </Button>
              </div>
            )}
            {!editor && filtered.length > 0 && (
              <div className={cn("pointer-events-auto absolute top-3 right-3", panelOpen && "md:right-[428px]")}>
                <Button variant="secondary" size="sm" className="bg-card shadow-md" onClick={showAll}>
                  <MapIcon />
                  看全部足跡
                </Button>
              </div>
            )}
            <div className="pointer-events-auto absolute bottom-3 left-3 max-w-xs">
              <div className="hidden rounded-2xl bg-card/95 px-3 py-2 text-xs leading-5 shadow-md md:block">
              <p>
                <span className="mr-1 inline-block size-2.5 rounded-full bg-terracotta align-middle" />
                到過的城市
              </p>
              <p className="mt-1">紅色是城市範圍。旗幟標在停留的位置，數字是同一趟旅程的順序。</p>
              </div>
            </div>
            {!editor && trips.length === 0 && (
              <div className="pointer-events-auto absolute inset-x-4 bottom-6 mx-auto max-w-sm rounded-3xl bg-card p-4 shadow-xl md:bottom-16">
                <p className="font-display text-2xl">從這裡開始</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  旗幟會標在你去過的城市。點開會看到那次的路線，以及當地常被提到的景點。
                </p>
                <Button className="mt-3 w-full" onClick={startCreate}>
                  記錄一趟旅程
                </Button>
              </div>
            )}
            {panelOpen && (
              <DetailPanel
                trip={selectedTrip}
                pin={selectedTrip ? null : selectedPin}
                focusStopId={focusStopId}
                onFocusStop={focusStop}
                onOpenTrip={(tripId, stopId) => openTrip(tripId, stopId)}
                onEdit={startEdit}
                onDelete={askDelete}
                onClose={() => {
                  setSelectedTripId(null)
                  setSelectedPinKey(null)
                  setFocusStopId(null)
                }}
              />
            )}
          </div>
        </main>
      </div>

      {editor === null && (
        <nav className="grid grid-cols-2 border-t bg-card md:hidden">
          <button
            type="button"
            className={cn("flex items-center justify-center gap-2 py-3 text-sm", mobileView === "map" && "text-sea")}
            onClick={() => setMobileView("map")}
          >
            <MapIcon className="size-4" />
            地圖
          </button>
          <button
            type="button"
            className={cn("flex items-center justify-center gap-2 py-3 text-sm", mobileView === "list" && "text-sea")}
            onClick={() => setMobileView("list")}
          >
            <Flag className="size-4" />
            旅程
          </button>
        </nav>
      )}

      <input
        ref={importRef}
        type="file"
        accept="application/json"
        className="sr-only"
        onChange={(event) => void onImportFile(event.target.files?.[0])}
      />

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-full bg-[#241c16] px-4 py-2 text-sm text-[#f6f1e7] shadow-lg md:bottom-6">
          {toast}
        </div>
      )}

      <MemoryImportDialog open={memoryOpen} onOpenChange={setMemoryOpen} existing={trips} onAdd={addMemories} />
      <TraceImportDialog open={traceOpen} onOpenChange={setTraceOpen} existing={trips} onAdd={(drafts) => void addTraces(drafts)} />
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>讓別人看到我的旅程</DialogTitle>
            <DialogDescription>
              別人打開網站時會看到「公開足跡」。這本來自專案裡的 public/data/footprints.json。你這台裝置上的其他足跡本仍只留在這台瀏覽器。
            </DialogDescription>
          </DialogHeader>
          {shareOpen && <ShareLinkNotice />}
          <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
            <li>按「下載公開足跡」，存成 footprints.json。</li>
            <li>用這個檔案覆蓋專案裡的 public/data/footprints.json。</li>
            <li>推上 GitHub 之後，到 Settings → Pages，Source 選 GitHub Actions。</li>
            <li>把公開網址傳給朋友。朋友重新整理就能看到這些旅程。</li>
          </ol>
          <div className="space-y-2">
            <p className="font-medium">這台裝置上的足跡本</p>
            <p className="text-xs leading-5 text-muted-foreground">
              共用同一台電腦或手機時，各自建立一本。切換之後看到的旅程就不同。
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {bookStore.books.map((book) => {
                const active = book.id === activeBook?.id
                return (
                  <li key={book.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      className={cn(
                        "min-w-0 flex-1 rounded-xl px-3 py-2 text-left",
                        active ? "bg-[#e7f3f1] text-sea" : "hover:bg-secondary",
                      )}
                      onClick={() => openBook(book.id)}
                    >
                      <span className="block truncate font-medium">{book.name}</span>
                      <span className="text-xs text-muted-foreground">{active ? "使用中" : "切換到這本"}</span>
                    </button>
                    {bookStore.books.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => askRemoveBook(book)}>
                        刪除
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="flex gap-2">
              <Input
                value={bookNameDraft}
                maxLength={24}
                placeholder="朋友的名字，例如小明"
                aria-label="新的足跡本名稱"
                className="h-10 bg-card"
                onChange={(event) => setBookNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    addBook()
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addBook} disabled={!bookNameDraft.trim()}>
                建立
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => void copyShareLink()}>
              複製網址
            </Button>
            <Button type="button" onClick={() => void downloadPublicFootprints()}>
              下載公開足跡
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                confirm?.action()
                setConfirm(null)
              }}
            >
              {confirm?.confirmLabel ?? "確認"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShareLinkNotice() {
  const origin = window.location.origin
  const localOnly = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  return (
    <div className="space-y-2">
      <p className="break-all rounded-xl bg-secondary px-3 py-2 text-xs">{origin}</p>
      {localOnly && (
        <p className="text-xs leading-5 text-muted-foreground">
          這個網址現在只在這台電腦上。朋友要從自己的手機看到你的旅程，需要先把 footprints.json 放進專案，再發布到 GitHub Pages。
        </p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-secondary px-3 py-1 text-xs">
      <span className="font-medium text-foreground">{value}</span>
      <span className="ml-1 text-muted-foreground">{label}</span>
    </span>
  )
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs",
        active ? "bg-ink text-white" : "bg-secondary text-foreground",
      )}
    >
      {children}
    </button>
  )
}
