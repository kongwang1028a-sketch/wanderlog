import { decideLiveSync, LIVE_BOOK_ID, LIVE_BOOK_URL, tripSignature } from "@/lib/live-book"
import {
  isPublishedBookActive,
  isTrip,
  readLiveEditedAt,
  readPublishedTrips,
  rememberLiveRevision,
  writePublishedTrips,
} from "@/lib/storage"
import type { ExportBundle, Trip } from "@/lib/types"

export type LiveSyncResult = "pushed" | "pulled" | "same" | "failed" | "skipped"

let editGeneration = 0
let syncTail: Promise<void> = Promise.resolve()

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = syncTail.then(job, job)
  syncTail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function liveUrl() {
  return `${LIVE_BOOK_URL}/${LIVE_BOOK_ID}`
}

export function noteLiveEdit() {
  editGeneration += 1
}

export async function fetchLiveBook(): Promise<ExportBundle | null> {
  const response = await fetch(liveUrl(), { cache: "no-store" })
  if (!response.ok) return null
  const parsed: unknown = await response.json()
  if (!parsed || typeof parsed !== "object") return null
  const record = parsed as Partial<ExportBundle>
  if (!Array.isArray(record.trips)) return null
  const trips = record.trips.filter(isTrip)
  if (trips.length === 0 || typeof record.exportedAt !== "string") return null
  return { version: 1, exportedAt: record.exportedAt, trips, photos: [] }
}

export async function pushLiveBook(trips: Trip[], exportedAt: string) {
  if (trips.length === 0) return false
  const response = await fetch(liveUrl(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version: 1, exportedAt, trips, photos: [] }),
    cache: "no-store",
  })
  return response.ok
}

export function reconcilePublishedBook(staticBundle: ExportBundle): Promise<LiveSyncResult> {
  const seen = editGeneration
  return enqueue(async () => {
    if (seen !== editGeneration) return "skipped"
    const local = readPublishedTrips()
    if (!local || local.length === 0) return "same"
    let remote: ExportBundle | null = null
    try {
      remote = await fetchLiveBook()
    } catch {
      return "failed"
    }
    if (seen !== editGeneration) return "skipped"
    const decision = decideLiveSync({
      localSignature: tripSignature(local),
      staticSignature: tripSignature(staticBundle.trips),
      remoteSignature: remote ? tripSignature(remote.trips) : null,
      localEditedAt: readLiveEditedAt(),
      remoteEditedAt: remote ? Date.parse(remote.exportedAt) || 0 : 0,
    })
    if (decision === "push") {
      if (seen !== editGeneration) return "skipped"
      const exportedAt = new Date().toISOString()
      rememberLiveRevision(exportedAt)
      try {
        const ok = await pushLiveBook(local, exportedAt)
        return ok ? "pushed" : "failed"
      } catch {
        return "failed"
      }
    }
    if (decision === "pull" && remote) {
      if (seen !== editGeneration) return "skipped"
      writePublishedTrips(remote.trips, remote.exportedAt)
      return "pulled"
    }
    return "same"
  })
}

export function publishActiveBook(): Promise<LiveSyncResult> {
  noteLiveEdit()
  return enqueue(async () => {
    if (!isPublishedBookActive()) return "skipped"
    const trips = readPublishedTrips()
    if (!trips || trips.length === 0) return "skipped"
    const exportedAt = new Date().toISOString()
    rememberLiveRevision(exportedAt)
    try {
      const ok = await pushLiveBook(trips, exportedAt)
      return ok ? "pushed" : "failed"
    } catch {
      return "failed"
    }
  })
}
