export type ExtractedFlight = {
  aircraft: string
  route: string
}

export type ExtractedStay = {
  name: string
}

export type ExtractedDetails = {
  flights: ExtractedFlight[]
  stays: ExtractedStay[]
}

const HOTEL = /酒店|飯店|旅館|旅店|民宿|ホテル|Hotel|Resort/i
const SKIP_HOTEL = /寄放|建議|Check-?out|午餐|晚餐|行程|購物/

export function extractTripDetails(raw: string): ExtractedDetails {
  const flights: ExtractedFlight[] = []
  const stays: ExtractedStay[] = []
  const flightKeys = new Set<string>()
  const stayNames = new Set<string>()

  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const stay = hotelFromLine(line)
    if (stay && !stayNames.has(stay)) {
      stayNames.add(stay)
      stays.push({ name: stay })
    }
    const flight = flightFromLine(line)
    if (!flight) continue
    const previous = flights[flights.length - 1]
    if (flight.aircraft && !flight.route && previous?.route && !previous.aircraft) {
      previous.aircraft = flight.aircraft
      continue
    }
    const key = `${flight.aircraft}|${flight.route}`
    if (flightKeys.has(key)) continue
    flightKeys.add(key)
    flights.push(flight)
  }

  return { flights, stays }
}

function hotelFromLine(line: string): string | null {
  const trimmed = line.replace(/\s+/g, " ").trim()
  if (trimmed.length < 2 || trimmed.length > 48) return null
  if (SKIP_HOTEL.test(trimmed) || !HOTEL.test(trimmed)) return null
  const name = trimmed
    .replace(/^[\s\p{Extended_Pictographic}\p{Emoji_Presentation}*・•\-–—]+/u, "")
    .replace(/^(?:Day\s*\d+(?:\s*[-~～到至]\s*\d+)?|第\s*\d+\s*天)\s*[：:]\s*/i, "")
    .replace(/^\d{1,2}:\d{2}\s*/, "")
    .replace(/\s*[（(][^）)]*[）)]\s*$/, "")
    .trim()
  if (name.length < 2 || name.length > 32 || SKIP_HOTEL.test(name) || !HOTEL.test(name)) return null
  return name
}

function flightFromLine(line: string): ExtractedFlight | null {
  const trimmed = line.replace(/\s+/g, " ").trim()
  if (!trimmed || trimmed.length > 80) return null
  const labeled = /機型\s*[：:]\s*([^\n，,。]{2,24})/.exec(trimmed)?.[1]?.trim() ?? ""
  const aircraft = labeled || modelIn(trimmed)
  const route = /^([A-Z]{2}\d{1,4})\b/.exec(trimmed)?.[1] ?? ""
  if (!aircraft && !route) return null
  return { aircraft, route }
}

function modelIn(line: string) {
  const named = /(?:波音|空中巴士|Boeing|Airbus)\s*[A-Z]?\d{2,4}(?:[-－]\d{2,4})?/.exec(line)
  if (named) return named[0].replace(/\s+/g, " ").trim()
  if (!/機型|航班|航空|aircraft/i.test(line)) return ""
  return /\b(?:A3[0-9]{2}|B7[0-9]{2}|787|777|747|737)(?:[-－]\d{2,4})?\b/.exec(line)?.[0] ?? ""
}
