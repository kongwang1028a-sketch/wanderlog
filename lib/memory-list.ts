import type { City } from "@/lib/cities"
import { citiesMentioned } from "@/lib/itinerary"

export type MemoryTrip = {
  title: string
  startDate: string
  endDate: string
  cities: City[]
  unmatched: string[]
  line: string
}

export type MemoryList = {
  trips: MemoryTrip[]
  skipped: string[]
  summary: string
}

const NOISE = /^(?:左右|大概|記得|好像|然後|還有|以及|去了|去過|玩了|旅行|旅遊|自由行|行程|城市|年份)$/

export function parseMemoryList(raw: string): MemoryList {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean)

  const trips: MemoryTrip[] = []
  const skipped: string[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const dated = readDatedPrefix(line) ?? readDatedSuffix(line)
    const rest = dated?.rest ?? line
    const cities = citiesMentioned(rest)
    if (cities.length === 0 || !mostlyPlaces(rest, cities, Boolean(dated))) {
      skipped.push(line)
      continue
    }
    const title = titleFor(cities, rest)
    const startDate = dated?.startDate ?? ""
    const endDate = dated?.endDate ?? ""
    const key = `${startDate}|${title}|${cities.map((city) => city.id).join(",")}`
    if (seen.has(key)) continue
    seen.add(key)
    trips.push({
      title,
      startDate,
      endDate,
      cities,
      unmatched: unmatchedTokens(rest, cities),
      line,
    })
  }

  const summary = buildSummary(trips, skipped)
  return { trips, skipped, summary }
}

export function sameMemory(trip: MemoryTrip, existing: { title: string; startDate: string; stops: { cityId?: string }[] }) {
  if ((trip.startDate.slice(0, 4) || "") !== (existing.startDate.slice(0, 4) || "")) return false
  if (trip.title !== existing.title) return false
  return trip.cities.map((city) => city.id).join(",") === existing.stops.map((stop) => stop.cityId ?? "").join(",")
}

function buildSummary(trips: MemoryTrip[], skipped: string[]) {
  if (trips.length === 0) return "沒有讀出旅程。一行寫一趟，例如「2019 朱諾、黃刀鎮」。"
  const names = trips
    .slice(0, 4)
    .map((trip) => trip.title)
    .join("、")
  let text = `讀出 ${trips.length} 趟：${names}`
  if (trips.length > 4) text += "…"
  if (skipped.length > 0) text += `。另有 ${skipped.length} 行沒有讀成旅程`
  return text
}

function mostlyPlaces(rest: string, cities: City[], dated: boolean) {
  if (dated) return true
  const leftover = stripCities(rest, cities).replace(/[\s、,，/／→⇒\-–—~～和與及]+/g, "")
  return leftover.length === 0
}

function titleFor(cities: City[], rest: string) {
  const label = stripCities(rest, cities)
    .replace(/[\s、,，/／→⇒\-–—~～和與及]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (label.length >= 2 && label.length <= 20 && /[\p{Script=Han}]/u.test(label)) return label.slice(0, 24)
  return cities.map((city) => city.zh).join("、")
}

function unmatchedTokens(rest: string, cities: City[]) {
  const tokens = stripCities(rest, cities)
    .split(/[\s、,，/／→⇒\-–—~～和與及]+/)
    .map((token) => token.trim())
    .filter(Boolean)
  return tokens.filter((token) => {
    if (NOISE.test(token) || /^\d+$/.test(token)) return false
    return /[\p{Script=Han}]{2,}/u.test(token) || /[A-Za-z]{3,}/.test(token)
  })
}

function stripCities(rest: string, cities: City[]) {
  let text = rest
  const names = cities.flatMap((city) => [city.zh, city.en, ...(city.aliases ?? [])]).sort((a, b) => b.length - a.length)
  for (const name of names) {
    if (name.length < 2) continue
    text = text.split(name).join(" ")
  }
  return text
}

function normalizeLine(line: string) {
  return line
    .replace(/\uFEFF/g, "")
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/[－–—~～〜]/g, "-")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/：/g, ":")
    .replace(/\u3000/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^\s*(?:[-*•·●]+|\d{1,2}[.、)])\s*/, "")
    .trim()
}

function readDatedSuffix(line: string) {
  const match = line.match(/^(.*\S)\s+(\d{4}.*)$/)
  if (!match) return null
  const dated = readDatedPrefix(match[2] ?? "")
  if (!dated || dated.rest) return null
  return { ...dated, rest: (match[1] ?? "").trim() }
}

function readDatedPrefix(input: string) {
  const text = input.trim()
  const yearText = text.slice(0, 4)
  if (!/^\d{4}$/.test(yearText)) return null
  const year = Number(yearText)
  if (year < 1970 || year > 2100) return null
  let index = 4
  if (text[index] === "年") index += 1

  let month: number | undefined
  let day: number | undefined
  const monthRead = readMonthDay(text, index)
  if (monthRead) {
    month = monthRead.month
    day = monthRead.day
    index = monthRead.next
  }

  let season: Season | undefined
  if (!month) {
    const seasonRead = readSeason(text, index)
    if (seasonRead) {
      season = seasonRead.season
      index = seasonRead.next
    }
  }

  let endYear = year
  let endMonth = month
  let endDay = day
  let ranged = false
  if (!season) {
    const range = readRange(text, index, year, month)
    if (range) {
      ranged = true
      endYear = range.year
      endMonth = range.month
      endDay = range.day
      index = range.next
    }
  }

  const rest = text.slice(index).trim()
  if (!month && !season && /^\d/.test(rest)) return null
  const endEdge = ranged || day ? "exact" : month ? "month" : "year"
  const startDate = season ? seasonStart(year, season) : boundDate(year, month, day, day ? "exact" : "start")
  const endDate = season ? seasonEnd(year, season) : boundDate(endYear, endMonth, endDay, endEdge)
  if (!startDate || !endDate || endDate < startDate) return null
  return { startDate, endDate, rest }
}

type Season = "春" | "夏" | "秋" | "冬"

function readMonthDay(text: string, index: number) {
  const slash = text.slice(index).match(/^(\d{1,2})\s*[/.]\s*(\d{1,2})/)
  if (slash) {
    const month = Number(slash[1])
    const day = Number(slash[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let next = index + slash[0].length
      if (text[next] === "日") next += 1
      return { month, day, next }
    }
  }
  const separator = text[index]
  if (separator === "/" || separator === "." || separator === "-") {
    const month = readNumber(text, index + 1, 2)
    if (!month || month.value < 1 || month.value > 12) return null
    let next = month.next
    if (text[next] === "月") next += 1
    const day = readDay(text, next, true)
    return { month: month.value, day: day?.value, next: day?.next ?? next }
  }
  const month = readNumber(text, index, 2)
  if (!month || text[month.next] !== "月" || month.value < 1 || month.value > 12) return null
  const day = readDay(text, month.next + 1, false)
  return { month: month.value, day: day?.value, next: day?.next ?? month.next + 1 }
}

function readDay(text: string, index: number, separated: boolean) {
  let cursor = index
  if (separated && (text[cursor] === "/" || text[cursor] === "." || text[cursor] === "-")) cursor += 1
  else if (separated) return null
  const day = readNumber(text, cursor, 2)
  if (!day || day.value < 1 || day.value > 31) return null
  let next = day.next
  if (text[next] === "日") next += 1
  return { value: day.value, next }
}

function readSeason(text: string, index: number) {
  const match = text.slice(index).match(/^\s*(春|夏|秋|冬)(?:天|季)?/)
  if (!match) return null
  return { season: match[1] as Season, next: index + match[0].length }
}

function readRange(text: string, index: number, year: number, month: number | undefined) {
  const match = text.slice(index).match(/^\s*[-至到]\s*/)
  if (!match) return null
  let cursor = index + match[0].length
  let endYear = year
  const yearDigits = readNumber(text, cursor, 4)
  if (yearDigits && yearDigits.value >= 1970 && yearDigits.value <= 2100 && text[yearDigits.next] !== undefined && /[年/.\-]/.test(text[yearDigits.next] ?? "")) {
    endYear = yearDigits.value
    cursor = yearDigits.next
    if (text[cursor] === "年") cursor += 1
  }
  const monthRead = readMonthDay(text, cursor)
  if (monthRead) {
    return { year: endYear, month: monthRead.month, day: monthRead.day, next: monthRead.next }
  }
  const day = readNumber(text, cursor, 2)
  if (!day || day.value < 1 || day.value > 31 || !month) return null
  let next = day.next
  if (text[next] === "日") next += 1
  if (/\d/.test(text[next] ?? "")) return null
  return { year: endYear, month, day: day.value, next }
}

function readNumber(text: string, index: number, max: number) {
  let end = index
  while (end < text.length && end - index < max && /\d/.test(text[end] ?? "")) end += 1
  if (end === index) return null
  return { value: Number(text.slice(index, end)), next: end }
}

function boundDate(year: number, month: number | undefined, day: number | undefined, edge: "start" | "year" | "month" | "exact") {
  if (!month) return edge === "year" ? `${year}-12-31` : `${year}-01-01`
  if (edge === "year") return `${year}-12-31`
  if (edge === "month") return lastOfMonth(year, month)
  return iso(year, month, day ?? 1)
}

function seasonStart(year: number, season: Season) {
  if (season === "春") return `${year}-03-01`
  if (season === "夏") return `${year}-06-01`
  if (season === "秋") return `${year}-09-01`
  return `${year}-12-01`
}

function seasonEnd(year: number, season: Season) {
  if (season === "春") return `${year}-05-31`
  if (season === "夏") return `${year}-08-31`
  if (season === "秋") return `${year}-11-30`
  const february = new Date(Date.UTC(year + 1, 2, 0)).getUTCDate()
  return `${year + 1}-02-${String(february).padStart(2, "0")}`
}

function lastOfMonth(year: number, month: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return iso(year, month, last)
}

function iso(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ""
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}
