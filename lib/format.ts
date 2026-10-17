import type { PhotoKind, Trip } from "@/lib/types"

export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${year}年${Number(month)}月${Number(day)}日`
}

export function isWholeYear(start: string, end: string) {
  return /^\d{4}-01-01$/.test(start) && end === `${start.slice(0, 4)}-12-31`
}

export function isWholeMonth(start: string, end: string) {
  const match = start.match(/^(\d{4})-(\d{2})-01$/)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return end === `${match[1]}-${match[2]}-${String(last).padStart(2, "0")}`
}

export function formatRange(start: string, end: string) {
  if (!start) return ""
  if (isWholeYear(start, end)) return `${start.slice(0, 4)}年`
  if (isWholeMonth(start, end)) return `${start.slice(0, 4)}年${Number(start.slice(5, 7))}月`
  if (!end || start === end) return formatDate(start)
  return `${formatDate(start)} – ${formatDate(end)}`
}

export function tripLength(start: string, end: string) {
  if (isWholeYear(start, end) || isWholeMonth(start, end)) return 0
  const from = Date.parse(`${start}T00:00:00`)
  const to = Date.parse(`${end}T00:00:00`)
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.round((Math.max(from, to) - Math.min(from, to)) / 86_400_000) + 1
}

export function totalTravelDays(trips: Trip[]) {
  let approximate = 0
  const ranges = trips
    .flatMap((trip) => {
      if (isWholeYear(trip.startDate, trip.endDate) || isWholeMonth(trip.startDate, trip.endDate)) {
        approximate += 1
        return []
      }
      const start = Date.parse(`${trip.startDate}T00:00:00`)
      const end = Date.parse(`${trip.endDate}T00:00:00`)
      if (Number.isNaN(start) || Number.isNaN(end)) return []
      return [[Math.min(start, end), Math.max(start, end)] as const]
    })
    .sort((a, b) => a[0] - b[0])

  let total = 0
  let currentStart = 0
  let currentEnd = -1

  for (const [start, end] of ranges) {
    if (currentEnd < 0) {
      currentStart = start
      currentEnd = end
      continue
    }
    if (start <= currentEnd + 86_400_000) {
      currentEnd = Math.max(currentEnd, end)
      continue
    }
    total += Math.round((currentEnd - currentStart) / 86_400_000) + 1
    currentStart = start
    currentEnd = end
  }

  if (currentEnd >= 0) {
    total += Math.round((currentEnd - currentStart) / 86_400_000) + 1
  }
  return total + approximate
}

export function detectPhotoKind(url: string): Exclude<PhotoKind, "upload"> {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (
      host === "drive.google.com" ||
      host === "docs.google.com" ||
      host === "photos.google.com" ||
      host.endsWith(".googleusercontent.com")
    ) {
      return "google-drive"
    }
    if (host === "icloud.com" || host.endsWith(".icloud.com")) return "icloud"
    return "web"
  } catch {
    return "web"
  }
}

export function photoKindLabel(kind: PhotoKind) {
  switch (kind) {
    case "upload":
      return "這台裝置"
    case "google-drive":
      return "Google 雲端"
    case "icloud":
      return "iCloud"
    case "web":
      return "網頁連結"
  }
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
