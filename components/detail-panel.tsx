"use client"

import { Pencil, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PhotoGallery } from "@/components/photo-gallery"
import { formatDate, formatRange, tripLength } from "@/lib/format"
import { flagEmoji, resolveSpots, routeDistanceKm } from "@/lib/geo"
import type { Pin, Stop, Trip } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DetailPanel({
  trip,
  pin,
  focusStopId,
  onFocusStop,
  onOpenTrip,
  onEdit,
  onDelete,
  onClose,
}: {
  trip: Trip | null
  pin: Pin | null
  focusStopId: string | null
  onFocusStop: (stop: Stop) => void
  onOpenTrip: (tripId: string, stopId: string) => void
  onEdit: (tripId: string) => void
  onDelete: (trip: Trip) => void
  onClose: () => void
}) {
  if (!trip && !pin) return null

  return (
    <section className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-h-[72%] flex-col overflow-hidden rounded-t-3xl border bg-card shadow-[0_-12px_40px_rgba(36,28,22,0.16)] md:inset-y-3 md:right-3 md:bottom-8 md:left-auto md:max-h-none md:w-[400px] md:rounded-3xl md:shadow-[0_16px_50px_rgba(36,28,22,0.16)]">
      <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border md:hidden" />
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-gold">
            {trip ? "這趟旅程" : "到過的地方"}
          </p>
          <h2 className="font-display text-2xl leading-tight text-balance">
            {trip ? trip.title : pin?.name}
          </h2>
        </div>
        <Button variant="ghost" size="icon" aria-label="關閉" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {trip ? (
          <TripBody
            trip={trip}
            focusStopId={focusStopId}
            onFocusStop={onFocusStop}
          />
        ) : pin ? (
          <PlaceBody pin={pin} onOpenTrip={onOpenTrip} />
        ) : null}
      </div>
      {trip && (
        <div className="flex gap-2 border-t bg-card px-4 py-3">
          <Button className="flex-1" onClick={() => onEdit(trip.id)}>
            <Pencil />
            編輯旅程
          </Button>
          <Button variant="destructive" onClick={() => onDelete(trip)}>
            <Trash2 />
            刪除
          </Button>
        </div>
      )}
    </section>
  )
}

function TripBody({
  trip,
  focusStopId,
  onFocusStop,
}: {
  trip: Trip
  focusStopId: string | null
  onFocusStop: (stop: Stop) => void
}) {
  const focused = trip.stops.find((stop) => stop.id === focusStopId) ?? trip.stops[0]
  const spots = focused ? resolveSpots(focused) : null
  const distance = routeDistanceKm(trip.stops)
  const countries = [...new Set(trip.stops.map((stop) => stop.countryCode))]

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{formatRange(trip.startDate, trip.endDate)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{tripLength(trip.startDate, trip.endDate)} 天</Badge>
          <span className="text-lg leading-none">{countries.map((code) => flagEmoji(code)).join(" ")}</span>
        </div>
      </div>

      <section>
        <h3 className="font-display text-lg">路線</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          地圖上的線是停留順序。{distance > 0 ? `直線大約 ${distance.toLocaleString("zh-Hant")} 公里。` : ""}
        </p>
        <ol className="mt-3 space-y-2">
          {trip.stops.map((stop, index) => {
            const active = stop.id === focused?.id
            return (
              <li key={stop.id}>
                <button
                  type="button"
                  onClick={() => onFocusStop(stop)}
                  className={cn(
                    "flex w-full gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                    active ? "border-terracotta/50 bg-[#fff4ee]" : "bg-background hover:bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      active ? "bg-sea text-white" : "bg-secondary text-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{stop.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {flagEmoji(stop.countryCode)} {stop.country}
                      </span>
                    </span>
                    {stop.date && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{formatDate(stop.date)}</span>
                    )}
                    {stop.note && <span className="mt-1 block text-sm leading-5">{stop.note}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      {focused && spots && (
        <section>
          <h3 className="font-display text-lg">{focused.name}的知名景點</h3>
          <SpotList spots={spots.spots} source={spots.source} placeLabel={spots.placeLabel} />
        </section>
      )}

      {trip.notes && (
        <section>
          <h3 className="font-display text-lg">備註</h3>
          <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{trip.notes}</p>
        </section>
      )}

      <section>
        <h3 className="mb-2 font-display text-lg">照片與雲端</h3>
        <PhotoGallery photos={trip.photos} focusStopId={focused?.id} />
      </section>
    </div>
  )
}

function PlaceBody({
  pin,
  onOpenTrip,
}: {
  pin: Pin
  onOpenTrip: (tripId: string, stopId: string) => void
}) {
  const spots = resolveSpots({
    cityId: pin.cityId,
    lat: pin.lat,
    lng: pin.lng,
    countryCode: pin.countryCode,
  })

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {flagEmoji(pin.countryCode)} {pin.country} · 來過 {pin.visits.length} 次
      </p>
      <section>
        <h3 className="font-display text-lg">哪幾趟來過</h3>
        <ul className="mt-2 space-y-2">
          {pin.visits
            .slice()
            .sort((a, b) => b.startDate.localeCompare(a.startDate))
            .map((visit) => (
              <li key={`${visit.tripId}-${visit.stopId}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border bg-background px-3 py-3 text-left hover:bg-secondary"
                  onClick={() => onOpenTrip(visit.tripId, visit.stopId)}
                >
                  <span className="font-medium">{visit.title}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(visit.startDate)}</span>
                </button>
              </li>
            ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">點一趟旅程，地圖會畫出那次的路線。</p>
      </section>
      <Separator />
      <section>
        <h3 className="font-display text-lg">{pin.name}的知名景點</h3>
        <SpotList spots={spots.spots} source={spots.source} placeLabel={spots.placeLabel} />
      </section>
    </div>
  )
}

function SpotList({
  spots,
  source,
  placeLabel,
}: {
  spots: { name: string; blurb: string }[]
  source: "city" | "nearby" | "country" | "none"
  placeLabel: string
}) {
  if (source === "none" || spots.length === 0) {
    return (
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        這個地點還沒有收錄景點。可以在停留備註裡寫下你自己記得的地方。
      </p>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      {source === "nearby" && (
        <p className="text-xs leading-5 text-muted-foreground">
          座標靠近{placeLabel}，以下是那裡常被拜訪的地方。
        </p>
      )}
      {source === "country" && (
        <p className="text-xs leading-5 text-muted-foreground">
          這附近還沒有收錄特定城市，先列出這個國家常被提到的去處，不一定就在你停留的旁邊。
        </p>
      )}
      {spots.map((spot) => (
        <article key={spot.name} className="rounded-2xl bg-secondary px-3 py-2.5">
          <h4 className="font-medium">{spot.name}</h4>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{spot.blurb}</p>
        </article>
      ))}
    </div>
  )
}
