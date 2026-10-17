import { CITIES, cityById, type City } from "@/lib/cities"

export type ParsedStop = {
  city: City
  date?: string
  note?: string
}

export type ParsedItinerary = {
  title: string
  startDate: string
  endDate: string
  stops: ParsedStop[]
  unmatched: string[]
  summary: string
}

const TITLE_HINT = /自由行|之旅|旅行|行程|旅遊|度假|出差/
const HOME_HINT = /回國|返國|返台|返臺|回台|回臺|回家|回程/
const NOTE_NOISE = /^(?:回國|返國|返台|返臺|回台|回臺|回家|回程|返回|出發|抵達|到達|轉機|回)$/
const JOINERS = new Set(["and", "to", "via", "from", "then", "the", "of", "in"])
const AMBIGUOUS_LATIN = new Set(["nice"])

const EXTRA_NAMES: Record<string, string[]> = {
  "jp-tokyo": ["東京都"],
  "tw-taipei": ["臺北"],
  "tw-taichung": ["臺中"],
  "es-barcelona": ["巴塞羅那"],
  "it-florence": ["佛羅倫薩", "翡冷翠"],
  "de-munich": ["慕尼克"],
  "ch-zurich": ["蘇黎士"],
  "ae-dubai": ["迪拜"],
  "tr-istanbul": ["伊斯坦布爾"],
  "vn-saigon": ["胡志明"],
}

const AIRPORTS: { text: string; cityId: string }[] = [
  { text: "關西國際機場", cityId: "jp-osaka" },
  { text: "關西機場", cityId: "jp-osaka" },
  { text: "成田國際機場", cityId: "jp-tokyo" },
  { text: "成田機場", cityId: "jp-tokyo" },
  { text: "羽田機場", cityId: "jp-tokyo" },
  { text: "成田", cityId: "jp-tokyo" },
  { text: "羽田", cityId: "jp-tokyo" },
  { text: "桃園國際機場", cityId: "tw-taipei" },
  { text: "桃園機場", cityId: "tw-taipei" },
  { text: "桃機", cityId: "tw-taipei" },
  { text: "中部國際機場", cityId: "jp-nagoya" },
  { text: "那霸機場", cityId: "jp-naha" },
  { text: "福岡機場", cityId: "jp-fukuoka" },
  { text: "福岡國際機場", cityId: "jp-fukuoka" },
]

type PlaceKind = "city" | "spot" | "airport"

type Needle = {
  text: string
  city: City
  kind: PlaceKind
  latin: boolean
}

type PlaceHit = {
  index: number
  length: number
  city: City
  kind: PlaceKind
  slice: string
}

type DateHit = {
  index: number
  length: number
  start: string
  end: string
}

type Draft = {
  city: City
  date?: string
  note?: string
  dayIndex?: number
  fromReturn: boolean
  gateway?: boolean
}

const needles = buildNeedles()
const latinNames = new Set(needles.filter((needle) => needle.latin).map((needle) => needle.text.toLowerCase()))

export function parseItinerary(raw: string, today = new Date()): ParsedItinerary {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => stripDecor(stripBullet(normalize(line))).trim())

  const initialYear = firstExplicitYear(lines.join("\n")) ?? today.getFullYear()
  const titleHit = pickTitle(lines)
  const drafts: Draft[] = []
  const unmatched: string[] = []
  const bounds: string[] = []
  let year = initialYear
  let lastMonth = 0
  let carry: string | undefined
  let headerStart = ""

  const remember = (iso: string | undefined) => {
    if (iso) bounds.push(iso)
  }

  const consumeDates = (line: string) => {
    const hits = findDates(line, () => ({ year, lastMonth }), (nextYear, nextMonth) => {
      year = nextYear
      lastMonth = nextMonth
    })
    for (const hit of hits) {
      remember(hit.start)
      remember(hit.end)
    }
    return hits
  }

  const parseStops = (line: string, datesOnly: boolean) => {
    const dates = consumeDates(line)
    const ranged = dates.find((hit) => hit.start !== hit.end)
    if (ranged && !headerStart) headerStart = ranged.start
    if (dates.length === 1 && dates[0]?.start !== dates[0]?.end) carry = undefined
    else if (dates.length > 0 && dates.every((hit) => hit.start === hit.end)) carry = dates[dates.length - 1]?.start

    const dayIndex = findDay(line)
    const pureDate = dates.length > 0 && residue(line, dates).length === 0
    const goingHome = HOME_HINT.test(line)

    if (pureDate) {
      const hit = dates[0]
      if (!headerStart && hit) headerStart = hit.start
      return
    }

    if (datesOnly) return
    if (!isItineraryLine(line, dates, dayIndex)) return

    const hits = dates.length > 0 ? dates : [undefined]
    const occupied = Array.from({ length: line.length }, () => false)
    for (const hit of dates) mark(occupied, hit.index, hit.length)
    const placeOnly = isPlaceOnly(stripDateText(line, dates))
    const places = findPlaces(line, occupied, { hasDate: dates.length > 0 || dayIndex !== undefined, placeOnly })
    if (isDayTheme(line, dates, places)) return

    const noted = blankDates(line, dates)
    let produced = 0
    hits.forEach((hit, hitIndex) => {
      const from = hit && hitIndex > 0 ? hit.index : 0
      const to = dates[hitIndex + 1]?.index ?? line.length
      const inSegment = places.filter((place) => place.index >= from && place.index < to)
      const chosen = choosePlaces(inSegment, goingHome)
      if (chosen.length === 0) return
      const dayDate = !hit && dayIndex && headerStart ? addDays(headerStart, dayIndex - 1) : undefined
      const date = hit?.start ?? dayDate ?? carry
      for (const place of chosen) {
        if (goingHome && drafts.some((draft) => draft.city.id === place.city.id)) continue
        const nextPlace = chosen.find((item) => item.index > place.index)
        const source = line.slice(place.index, nextPlace ? nextPlace.index : to)
        const note = tightenNote(noteFor(noted, from, to, hit, chosen, place), source)
        drafts.push({
          city: place.city,
          date,
          note,
          dayIndex: hit || dayDate ? undefined : dayIndex,
          fromReturn: goingHome && place.city.code === "TW",
          gateway: place.kind === "airport" && place.city.code === "TW",
        })
        produced += 1
      }
    })

    if (produced > 0) return
    if (goingHome && dates.length > 0) return
    if (worthReporting(line, dates)) unmatched.push(line.trim())
  }

  lines.forEach((line, index) => {
    if (!line) return
    const datesOnly = index === titleHit.index
    parseStops(line, datesOnly)
  })

  if (drafts.length === 0 && titleHit.index >= 0) {
    parseStops(lines[titleHit.index] ?? "", false)
  }

  const hasForeign = drafts.some((draft) => draft.city.code !== "TW")
  const visible = drafts.filter((draft) => !(draft.city.code === "TW" && hasForeign && (draft.gateway || draft.fromReturn)))
  const merged = mergeStops(visible)

  let startDate = bounds.reduce((min, iso) => (min && min < iso ? min : iso), "")
  if (!headerStart) headerStart = startDate
  for (const draft of merged) {
    if (!draft.date && draft.dayIndex && headerStart) draft.date = addDays(headerStart, draft.dayIndex - 1)
    if (draft.date) remember(draft.date)
  }
  startDate = bounds.reduce((min, iso) => (min && min < iso ? min : iso), "")
  const endDate = bounds.reduce((max, iso) => (max && max > iso ? max : iso), "")

  const stops = merged.map((draft) => ({
    city: draft.city,
    date: draft.date,
    note: draft.note,
  }))
  const title = titleHit.title
  const summary = buildSummary(title, startDate, endDate, stops, unmatched)

  return { title, startDate, endDate, stops, unmatched, summary }
}

function buildSummary(
  title: string,
  startDate: string,
  endDate: string,
  stops: ParsedStop[],
  unmatched: string[],
) {
  if (stops.length === 0) return "沒有讀出城市。可以寫成「11/2 大阪」。"
  const range = startDate && endDate ? `${monthDay(startDate)}–${monthDay(endDate)}，` : ""
  const name = stops.map((stop) => stop.city.zh).join("、")
  let text = `已讀出${title ? `「${title}」，` : ""}${range}${stops.length} 個停留：${name}`
  if (!startDate) text += "。大綱裡沒有寫日期"
  if (unmatched.length > 0) text += `。另有 ${unmatched.length} 行沒有對上城市`
  return text
}

function monthDay(iso: string) {
  const [, month, day] = iso.split("-")
  return `${Number(month)}/${Number(day)}`
}

function choosePlaces(places: PlaceHit[], isReturn: boolean) {
  const cities = places.filter((place) => place.kind !== "airport")
  const airports = places.filter((place) => place.kind === "airport")
  const foreign = cities.some((place) => place.city.code !== "TW")
  const chosen = [...cities]
  if (airports.length > 0 && (cities.length === 0 || (isReturn && !foreign))) {
    chosen.unshift(...airports)
  }
  const seen = new Set<string>()
  const unique: PlaceHit[] = []
  for (const place of chosen.sort((a, b) => a.index - b.index)) {
    if (seen.has(place.city.id)) continue
    seen.add(place.city.id)
    unique.push(place)
  }
  return unique
}

function noteFor(line: string, from: number, to: number, hit: DateHit | undefined, chosen: PlaceHit[], place: PlaceHit) {
  const anchors = [...chosen.filter((item) => item.kind !== "spot")].sort((a, b) => a.index - b.index)
  const anchor = anchors.find((item) => item.city.id === place.city.id)
  if (!anchor) {
    if (chosen.length > 1) return undefined
    return cleanNote(line.slice(hit ? hit.index + hit.length : from, to))
  }
  const position = anchors.findIndex((item) => item === anchor)
  const next = anchors[position + 1]
  const prefix = position <= 0 ? line.slice(hit ? hit.index + hit.length : from, anchor.index) : ""
  const body = line.slice(anchor.index + anchor.length, next ? next.index : to)
  return cleanNote(`${prefix} ${body}`)
}

function mergeStops(drafts: Draft[]) {
  const merged: Draft[] = []
  for (const draft of drafts) {
    const previous = merged[merged.length - 1]
    if (previous && previous.city.id === draft.city.id) {
      if (!previous.date || (draft.date && draft.date < previous.date)) previous.date = draft.date
      if (!previous.dayIndex) previous.dayIndex = draft.dayIndex
      previous.note = joinNotes(previous.note, draft.note)
      previous.fromReturn = previous.fromReturn && draft.fromReturn
      continue
    }
    merged.push({ ...draft })
  }
  return merged
}

function joinNotes(left?: string, right?: string) {
  const parts = [left, right].flatMap((item) => (item ? item.split("、") : []))
  const unique = [...new Set(parts.map((item) => item.trim()).filter(Boolean))]
  const pruned = unique.filter((part) => !unique.some((other) => other !== part && other.includes(part)))
  return pruned.length > 0 ? pruned.join("、").slice(0, 120) : undefined
}

function pickTitle(lines: string[]) {
  const hinted = lines.findIndex((line) => {
    const stripped = stripDateText(line, findDates(line, () => ({ year: 2000, lastMonth: 0 }), () => undefined)).trim()
    return stripped.length >= 2 && stripped.length <= 40 && TITLE_HINT.test(stripped)
  })
  if (hinted >= 0) return { index: hinted, title: cleanTitle(lines[hinted] ?? "") }
  const plain = lines.findIndex((line) => {
    if (!line || line.length > 24) return false
    if (findDates(line, () => ({ year: 2000, lastMonth: 0 }), () => undefined).length > 0) return false
    if (HOME_HINT.test(line)) return false
    const occupied = Array.from({ length: line.length }, () => false)
    return findPlaces(line, occupied, { hasDate: false, placeOnly: true }).length === 0
  })
  if (plain >= 0) return { index: plain, title: cleanTitle(lines[plain] ?? "") }
  return { index: -1, title: "" }
}

function cleanTitle(line: string) {
  const dates = findDates(line, () => ({ year: 2000, lastMonth: 0 }), () => undefined)
  return stripDateText(line, dates)
    .replace(/[()（）[\]【】]/g, " ")
    .replace(/行程總整理|總整理|詳細行程|行程表/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
}

function findDates(
  line: string,
  read: () => { year: number; lastMonth: number },
  write: (year: number, month: number) => void,
) {
  const hits: DateHit[] = []
  const pattern = /(?:(\d{4})\s*[年/.])?\s*(\d{1,2})\s*[月/.]\s*(\d{1,2})(?:\s*[日號])?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(line))) {
    const index = match.index
    if (index > 0 && /\d/.test(line[index - 1] ?? "")) continue
    const yearText = match[1]
    const month = Number(match[2])
    const day = Number(match[3])
    let length = match[0].length
    const range = readRange(line.slice(index + length), month)
    if (range) length += range.length
    if (/\d/.test(line[index + length] ?? "")) continue
    const start = resolveDate(yearText ? Number(yearText) : undefined, month, day, read(), write, true)
    if (!start) continue
    let end = start
    if (range) {
      const resolvedEnd = resolveDate(range.year, range.month, range.day, read(), write, false)
      if (resolvedEnd) end = resolvedEnd
      else length = match[0].length
    }
    pattern.lastIndex = index + length
    hits.push({ index, length, start, end })
  }
  return hits
}

function readRange(rest: string, startMonth: number) {
  const weekday = "(?:\\([^)]{0,12}\\)|星期[一二三四五六日天]|週[一二三四五六日天]|禮拜[一二三四五六日天])"
  const match = rest.match(new RegExp(`^(?:\\s*${weekday})?\\s*[-至到]\\s*(?:(\\d{4})\\s*[年/.])?\\s*(?:(\\d{1,2})\\s*[月/.]\\s*)?(\\d{1,2})(?:\\s*[日號])?(?:\\s*${weekday})?`))
  if (!match) return null
  const after = rest.slice(match[0].length)
  if (/^[人晚天時分個泊夜點元張]/.test(after)) return null
  const month = match[2] ? Number(match[2]) : startMonth
  const day = Number(match[3])
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null
  return { year: match[1] ? Number(match[1]) : undefined, month, day, length: match[0].length }
}

function resolveDate(
  explicitYear: number | undefined,
  month: number,
  day: number,
  cursor: { year: number; lastMonth: number },
  write: (year: number, month: number) => void,
  commit: boolean,
) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  let year = explicitYear ?? cursor.year
  if (!explicitYear && cursor.lastMonth && month < cursor.lastMonth) year += 1
  if (year < 1980 || year > 2100) return null
  const iso = toIso(year, month, day)
  if (!iso) return null
  if (commit) write(year, month)
  return iso
}

function toIso(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + days))
  return date.toISOString().slice(0, 10)
}

function findDay(line: string) {
  const match = line.match(/^(?:第\s*(\d{1,2})\s*[天日]|Day\s*(\d{1,2})\b|D(\d{1,2})\b)/i)
  if (!match) return undefined
  const day = Number(match[1] ?? match[2] ?? match[3])
  if (day < 1 || day > 60) return undefined
  return day
}

const TRAILING_REJECT: Record<string, string> = {
  高山: "症",
  日光: "浴",
  天神: "橋社祭宮",
  鹿兒島: "本",
  長崎: "本",
}

const REPORT_NOISE = /住宿資訊|住宿|航班|去程|回程|行前必知|重點整理|每日詳細|交通方式|交通建議|自由活動|飯店休息|午餐|晚餐|早餐|購物|採買|寄放|行李|報到|登機|離開|準時|移動|返回|前往|抵達|到達|出發|轉車|搭車|機場|車站|飯店|酒店|休息|集合|解散|時間|行程|項目|建議|處理事項|備註|訂位代碼|航廈|小時|分鐘/g

function rejectedTrail(line: string, text: string, index: number) {
  const banned = TRAILING_REJECT[text]
  if (!banned) return false
  return banned.includes(line[index + text.length] ?? "")
}

function isItineraryLine(line: string, dates: DateHit[], dayIndex?: number) {
  const head = line.trim()
  if (dates.length > 0 || dayIndex) return true
  if (/^(?:第\s*\d{1,2}\s*[天日]|Day\s*\d{1,2}\b|D\d{1,2}\b|\d{1,2}:\d{2}\b)/i.test(head)) return true
  if (/[→⇒]|->/.test(head)) return true
  if (isPlaceOnly(head)) return true
  return head.length > 0 && head.length <= 40
}

function isDayTheme(line: string, dates: DateHit[], places: PlaceHit[]) {
  if (dates.length === 0 || !findDay(line)) return false
  if (!/^(?:第\s*\d{1,2}\s*[天日]|Day\s*\d{1,2}\b|D\d{1,2}\b)/i.test(line.trim())) return false
  let text = stripDateText(line, dates).replace(/第\s*\d{1,2}\s*[天日]|Day\s*\d{1,2}|D\d{1,2}/gi, " ")
  for (const place of [...places].sort((a, b) => b.length - a.length)) text = text.replace(place.slice, " ")
  text = text.replace(/[^\p{Script=Han}A-Za-z]/gu, "")
  return text.length >= 4
}

function tightenNote(note: string | undefined, source: string) {
  const spots: string[] = []
  for (const needle of needles) {
    if (needle.kind !== "spot") continue
    if (source.includes(needle.text) && !spots.includes(needle.text)) spots.push(needle.text)
  }
  const parts = (note ?? "").split("、").map((part) => part.trim()).filter(usefulNotePart)
  if (spots.length > 0) {
    const extras = parts.filter((part) => part.length <= 8 && !spots.some((spot) => spot.includes(part) || part.includes(spot)))
    const unique = [...new Set([...spots, ...extras])]
    return unique.join("、").slice(0, 120)
  }
  const unique = [...new Set(parts)]
  if (unique.length === 0) return undefined
  return unique.join("、").slice(0, 120)
}

function usefulNotePart(part: string) {
  if (part.length < 3 || part.length > 16 || /^\d/.test(part) || /^[-:：]/.test(part)) return false
  if (!/[\p{Script=Han}]{2,}/u.test(part)) return false
  if (/[至線站約號的與或後在從往等]/.test(part)) return false
  if (/列車|分鐘|航廈|接駁|巴士|計程車|地下鐵|寄放|行李|搭乘|返回|前往|抵達|轉乘|原路|用餐|購物|午餐|晚餐|早餐|自由活動|登機|報到|採買|小時|特急|音速|活動|參觀|入住|換飯|地鐵|電車/.test(part)) return false
  return true
}

function isMeta(line: string, dates: DateHit[]) {
  const rest = residue(line, dates)
  if (!rest) return true
  if (/^(?:旅行日期|出發日期|回程日期|行程日期|住宿資訊|航班|去程|回程)+$/.test(rest)) return true
  if (/^[\d小時分鐘]+$/.test(rest)) return true
  return false
}

function worthReporting(line: string, dates: DateHit[]) {
  if (isMeta(line, dates)) return false
  let text = stripDateText(line, dates)
  text = text.replace(/\d{1,2}:\d{2}/g, " ")
  text = text.replace(/\b[A-Z0-9]{2,}\b/g, " ")
  text = text.replace(/第\s*\d{1,2}\s*[天日]|Day\s*\d{1,2}|D\d{1,2}/gi, " ")
  text = text.replace(REPORT_NOISE, " ")
  const han = text.match(/[\p{Script=Han}]{2,}/gu) ?? []
  const latin = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? []
  return han.length > 0 || latin.length > 0
}

function findPlaces(line: string, occupied: boolean[], context: { hasDate: boolean; placeOnly: boolean }) {
  const candidates: PlaceHit[] = []
  for (const needle of needles) {
    if (needle.latin) {
      const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(needle.text)}(?![A-Za-z0-9])`, "gi")
      let match: RegExpExecArray | null
      while ((match = pattern.exec(line))) {
        const slice = match[0]
        if (!acceptLatin(slice, needle.text, context)) continue
        candidates.push({ index: match.index, length: slice.length, city: needle.city, kind: needle.kind, slice })
      }
      continue
    }
    let from = 0
    while (from < line.length) {
      const index = line.indexOf(needle.text, from)
      if (index < 0) break
      if (!rejectedTrail(line, needle.text, index)) {
        candidates.push({ index, length: needle.text.length, city: needle.city, kind: needle.kind, slice: needle.text })
      }
      from = index + Math.max(needle.text.length, 1)
    }
  }
  candidates.sort((a, b) => b.length - a.length || kindRank(a.kind) - kindRank(b.kind) || a.index - b.index)
  const chosen: PlaceHit[] = []
  for (const candidate of candidates) {
    if (overlaps(occupied, candidate.index, candidate.length)) continue
    mark(occupied, candidate.index, candidate.length)
    chosen.push(candidate)
  }
  chosen.sort((a, b) => a.index - b.index)
  return chosen
}

export function citiesMentioned(text: string): City[] {
  const line = stripDecor(stripBullet(normalize(text))).trim()
  if (!line) return []
  const occupied = Array.from({ length: line.length }, () => false)
  const places = findPlaces(line, occupied, { hasDate: true, placeOnly: false })
  const foreign = places.some((place) => place.city.code !== "TW" && place.kind !== "airport")
  const chosen: City[] = []
  for (const place of places) {
    if (place.kind === "airport" && place.city.code === "TW" && foreign) continue
    if (chosen[chosen.length - 1]?.id === place.city.id) continue
    chosen.push(place.city)
  }
  return chosen
}

function acceptLatin(slice: string, needle: string, context: { hasDate: boolean; placeOnly: boolean }) {
  const capitalized = /^[A-Z]/.test(slice)
  if (AMBIGUOUS_LATIN.has(needle.toLowerCase())) return capitalized || context.placeOnly
  return context.hasDate || context.placeOnly || capitalized
}

function isPlaceOnly(text: string) {
  const tokens = text.match(/[A-Za-z][A-Za-z'.-]*/g) ?? []
  if (tokens.length === 0) return false
  return tokens.every((token) => JOINERS.has(token.toLowerCase()) || latinNames.has(token.toLowerCase()))
}

function blankDates(line: string, dates: DateHit[]) {
  if (dates.length === 0) return line
  const chars = [...line]
  for (const date of dates) {
    for (let index = date.index; index < date.index + date.length && index < chars.length; index += 1) {
      chars[index] = " "
    }
  }
  return chars.join("")
}

function stripDateText(line: string, dates: DateHit[]) {
  let text = line
  for (const date of [...dates].reverse()) {
    text = `${text.slice(0, date.index)} ${text.slice(date.index + date.length)}`
  }
  return text.replace(/\s+/g, " ").trim()
}

function residue(line: string, dates: DateHit[]) {
  return stripDateText(line, dates)
    .replace(/\([^)]{0,12}\)/g, " ")
    .replace(/星期[一二三四五六日天]|週[一二三四五六日天]|禮拜[一二三四五六日天]/g, " ")
    .replace(/[^\p{L}\p{N}]/gu, "")
}

function cleanNote(text: string) {
  const stripped = text
    .replace(/\([^)]{0,12}\)/g, " ")
    .replace(/星期[一二三四五六日天]|週[一二三四五六日天]|禮拜[一二三四五六日天]/g, " ")
    .replace(/自由行|之旅|旅行|行程|旅遊|度假|出差/g, " ")
    .replace(/第\s*\d{1,2}\s*[天日]/g, " ")
    .replace(/\bDay\s*\d{1,2}\b/gi, " ")
    .replace(/\bD\d{1,2}\b/g, " ")
    .replace(/->/g, " ")
    .replace(/[→⇒]/g, " ")
  const parts = stripped
    .split(/[\s、,，;；|/／]+/)
    .map((part) => part.trim())
    .filter((part) => part && !NOTE_NOISE.test(part))
  const unique = [...new Set(parts)]
  if (unique.length === 0) return undefined
  return unique.join("、").slice(0, 120)
}

function firstExplicitYear(text: string) {
  const match = text.match(/(\d{4})\s*[年/.]\s*\d{1,2}\s*[月/.]\s*\d{1,2}/) ?? text.match(/(\d{4})\s*年\s*\d{1,2}\s*月/)
  if (!match) return undefined
  const year = Number(match[1])
  if (year < 1980 || year > 2100) return undefined
  return year
}

function normalize(text: string) {
  return text
    .replace(/\uFEFF/g, "")
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/／/g, "/")
    .replace(/[－–—~～〜]/g, "-")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/：/g, ":")
    .replace(/\u3000/g, " ")
}

function stripDecor(line: string) {
  return line.replace(/^[^\p{L}\p{N}]+/u, "")
}

function stripBullet(line: string) {
  return line.replace(/^\s*(?:[-*•·●]+|\d{1,2}[.、)]|[(（]\d{1,2}[)）])\s*/, "")
}

function buildNeedles() {
  const list: Needle[] = []
  const spotOwners = new Map<string, Set<string>>()
  for (const city of CITIES) {
    for (const spot of city.spots) {
      const owners = spotOwners.get(spot.name) ?? new Set<string>()
      owners.add(city.id)
      spotOwners.set(spot.name, owners)
    }
  }
  const add = (text: string, city: City, kind: PlaceKind) => {
    const trimmed = text.trim()
    if (trimmed.length < 2) return
    list.push({ text: trimmed, city, kind, latin: /^[\x00-\x7F]+$/.test(trimmed) })
  }
  for (const city of CITIES) {
    add(city.zh, city, "city")
    if (!/[市都島]$/.test(city.zh)) add(`${city.zh}市`, city, "city")
    if (city.en.length >= 3) add(city.en, city, "city")
    for (const alias of city.aliases ?? []) add(alias, city, "city")
    for (const extra of EXTRA_NAMES[city.id] ?? []) add(extra, city, "city")
    for (const spot of city.spots) {
      if (spot.name.length < 3) continue
      if ((spotOwners.get(spot.name)?.size ?? 0) !== 1) continue
      add(spot.name, city, "spot")
    }
  }
  for (const airport of AIRPORTS) {
    const city = cityById(airport.cityId)
    if (city) add(airport.text, city, "airport")
  }
  list.sort((a, b) => b.text.length - a.text.length || kindRank(a.kind) - kindRank(b.kind))
  return list
}

function kindRank(kind: PlaceKind) {
  if (kind === "city") return 0
  if (kind === "airport") return 1
  return 2
}

function mark(occupied: boolean[], index: number, length: number) {
  for (let cursor = index; cursor < index + length && cursor < occupied.length; cursor += 1) occupied[cursor] = true
}

function overlaps(occupied: boolean[], index: number, length: number) {
  for (let cursor = index; cursor < index + length; cursor += 1) {
    if (occupied[cursor]) return true
  }
  return false
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
