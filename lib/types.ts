export type PhotoKind = "upload" | "google-drive" | "icloud" | "web"

export type PhotoRef = {
  id: string
  kind: PhotoKind
  caption: string
  url?: string
  stopId?: string
  addedAt: string
}

export type FlightRecord = {
  id: string
  aircraft: string
  route: string
}

export type StayRecord = {
  id: string
  name: string
  stopId?: string
}

export type Stop = {
  id: string
  cityId?: string
  name: string
  country: string
  countryCode: string
  lat: number
  lng: number
  date?: string
  note?: string
}

export type Trip = {
  id: string
  title: string
  startDate: string
  endDate: string
  notes: string
  stops: Stop[]
  flights: FlightRecord[]
  stays: StayRecord[]
  photos: PhotoRef[]
  createdAt: string
}

export type Pin = {
  key: string
  lat: number
  lng: number
  name: string
  country: string
  countryCode: string
  cityId?: string
  visits: {
    tripId: string
    stopId: string
    title: string
    startDate: string
    date: string
    places: string
  }[]
}

export type ExportBundle = {
  version: 1
  exportedAt: string
  trips: Trip[]
  photos: { id: string; dataUrl: string }[]
}
