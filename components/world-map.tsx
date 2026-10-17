"use client"

import { useEffect, useState } from "react"
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { cityRadiusMeters, pinYearLines } from "@/lib/geo"
import type { Pin } from "@/lib/types"

export type Camera =
  | { kind: "idle" }
  | {
      kind: "bounds"
      points: [number, number][]
      token: string
      padRight?: number
      padBottom?: number
      maxZoom?: number
    }
  | {
      kind: "fly"
      lat: number
      lng: number
      zoom: number
      token: string
      offsetX?: number
      offsetY?: number
    }

export type RouteStop = {
  id: string
  name: string
  lat: number
  lng: number
  index: number
  active: boolean
}

type WorldMapProps = {
  pins: Pin[]
  activePinKey?: string | null
  routeStops: RouteStop[]
  pickEnabled: boolean
  camera: Camera
  onPinClick: (key: string) => void
  onRouteStopClick: (id: string) => void
  onPick: (lat: number, lng: number) => void
}

function flagIcon(lines: string[], active: boolean, count: number, side: "left" | "right") {
  const badge = count > 1 ? `<span class="flag-count">${count}</span>` : ""
  const pennant = lines.map((line) => `<span class="flag-year">${line}</span>`).join("")
  const width = Math.max(52, ...lines.map((line) => 18 + line.length * 8))
  const height = 28 + lines.length * 16
  const anchorX = side === "left" ? width - 8 : 8
  return L.divIcon({
    className: "flag-marker",
    html: `<div class="flag-pin${active ? " is-active" : ""}${side === "left" ? " is-left" : ""}" style="width:${width}px;height:${height}px"><span class="flag-pennant" aria-hidden="true">${pennant}</span><span class="flag-pole"></span>${badge}</div>`,
    iconSize: [width, height],
    iconAnchor: [anchorX, height - 2],
    tooltipAnchor: [side === "left" ? -12 : width / 2, -height + 6],
  })
}

function pinTripLines(pin: Pin) {
  const trips = new Map<string, { title: string; date: string }>()
  for (const visit of pin.visits) {
    const existing = trips.get(visit.tripId)
    if (!existing || visit.date < existing.date) trips.set(visit.tripId, { title: visit.title, date: visit.date })
  }
  return [...trips.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function stopIcon(index: number, active: boolean, shift = { x: 0, y: 0 }) {
  return L.divIcon({
    className: "stop-marker",
    html: `<div class="stop-badge${active ? " is-active" : ""}">${index}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17 - shift.x, 17 - shift.y],
  })
}

function stopShift(stop: RouteStop, stops: RouteStop[]) {
  const same = stops.filter(
    (other) => Math.abs(other.lat - stop.lat) < 0.02 && Math.abs(other.lng - stop.lng) < 0.02,
  )
  if (same.length < 2) return { x: 0, y: 0 }
  const order = same.findIndex((other) => other.id === stop.id)
  const angle = -Math.PI / 2 + (order * 2 * Math.PI) / same.length
  return { x: Math.round(Math.cos(angle) * 20), y: Math.round(Math.sin(angle) * 20) }
}

function cameraKey(camera: Camera) {
  return camera.kind === "idle" ? "idle" : camera.token
}

function CameraRig({ camera }: { camera: Camera }) {
  const map = useMap()
  const key = cameraKey(camera)
  useEffect(() => {
    if (camera.kind === "idle") return
    let cancelled = false

    const move = () => {
      if (cancelled) return false
      if (map.getSize().x < 2 || map.getSize().y < 2) {
        map.invalidateSize({ pan: false })
      }
      const size = map.getSize()
      if (size.x < 2 || size.y < 2) return false

      if (camera.kind === "fly") {
        if (!Number.isFinite(camera.lat) || !Number.isFinite(camera.lng)) return false
        const zoom = camera.zoom
        const projected = map.project([camera.lat, camera.lng], zoom)
        const center = map.unproject(projected.add([camera.offsetX ?? 0, camera.offsetY ?? 0]), zoom)
        map.flyTo(center, zoom, { duration: 0.75 })
        return true
      }

      const points = camera.points.filter(
        (point): point is [number, number] => Number.isFinite(point[0]) && Number.isFinite(point[1]),
      )
      if (points.length === 0) return false
      const padRight = camera.padRight ?? 56
      const padBottom = camera.padBottom ?? 56
      const maxZoom = camera.maxZoom ?? (points.length <= 4 ? 8 : 5)
      if (points.length === 1) {
        const point = points[0]
        if (!point) return false
        const zoom = Math.min(8, maxZoom)
        const projected = map.project(point, zoom)
        const center = map.unproject(projected.add([padRight / 2, padBottom / 2]), zoom)
        map.flyTo(center, zoom, { duration: 0.75 })
        return true
      }
      const paddingBottomRight: [number, number] = [
        Math.min(padRight, Math.max(24, size.x / 3)),
        Math.min(padBottom, Math.max(24, size.y / 3)),
      ]
      map.flyToBounds(L.latLngBounds(points), {
        paddingTopLeft: [56, 64],
        paddingBottomRight,
        maxZoom,
        duration: 0.8,
      })
      return true
    }

    if (!move()) {
      const timer = window.setTimeout(() => {
        map.invalidateSize({ pan: false })
        move()
      }, 80)
      return () => {
        cancelled = true
        window.clearTimeout(timer)
      }
    }
    return () => {
      cancelled = true
    }
  }, [camera, key, map])
  return null
}

function PickLayer({
  enabled,
  onPick,
}: {
  enabled: boolean
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(event) {
      if (!enabled) return
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

class TraditionalTileLayer extends L.TileLayer {
  override createTile(coords: L.Coords, done: L.DoneCallback) {
    const tile = document.createElement("img")
    tile.referrerPolicy = "no-referrer"
    tile.alt = ""
    L.DomEvent.on(tile, "load", () => this._tileOnLoad(done, tile))
    L.DomEvent.on(tile, "error", () => this._tileOnError(done, tile, new Error("tile")))
    tile.src = this.getTileUrl(coords)
    return tile
  }
}

function TraditionalTiles() {
  const map = useMap()
  useEffect(() => {
    const layer = new TraditionalTileLayer("https://{s}.google.com/vt/lyrs=m&hl=zh-TW&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
      attribution: "&copy; Google",
    })
    layer.addTo(map)
    return () => {
      map.removeLayer(layer)
    }
  }, [map])
  return null
}

function YearMarkers({
  pins,
  activePinKey,
  onPinClick,
}: {
  pins: Pin[]
  activePinKey?: string | null
  onPinClick: (key: string) => void
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({
    zoom() {
      setZoom(map.getZoom())
    },
  })

  const points = pins.map((pin) => ({ pin, point: map.latLngToContainerPoint([pin.lat, pin.lng]) }))
  const side = new Map<string, "left" | "right">()
  for (const current of points) {
    let nearest = 78
    let facing: "left" | "right" = "right"
    for (const other of points) {
      if (other.pin.key === current.pin.key) continue
      const distance = Math.hypot(current.point.x - other.point.x, current.point.y - other.point.y)
      if (distance >= nearest) continue
      nearest = distance
      facing = current.point.x <= other.point.x ? "left" : "right"
    }
    side.set(current.pin.key, facing)
  }

  return (
    <>
      {pins.map((pin) => {
        const trips = pinTripLines(pin)
        return (
          <Marker
            key={pin.key}
            position={[pin.lat, pin.lng]}
            icon={flagIcon(
              pinYearLines(pin.visits, zoom),
              pin.key === activePinKey,
              pin.visits.length,
              side.get(pin.key) ?? "right",
            )}
            zIndexOffset={pin.key === activePinKey ? 800 : 0}
            eventHandlers={{
              click: () => onPinClick(pin.key),
            }}
          >
            <Tooltip direction="top" opacity={1}>
              <span className="font-medium">{pin.name}</span>
              <span className="text-muted-foreground"> · {pin.country}</span>
              {trips.map((trip) => (
                <span key={trip.date + trip.title} className="mt-0.5 block text-xs">
                  {trip.title}
                </span>
              ))}
            </Tooltip>
          </Marker>
        )
      })}
    </>
  )
}

function CityDiscs({ pins }: { pins: Pin[] }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({
    zoom() {
      setZoom(map.getZoom())
    },
  })
  return (
    <>
      {pins.map((pin) => (
        <Circle
          key={pin.key}
          center={[pin.lat, pin.lng]}
          radius={cityRadiusMeters(pin.lat, zoom)}
          interactive={false}
          pathOptions={{
            className: "city-disc",
            fillColor: "#c4553a",
            fillOpacity: 0.55,
            color: "#8c3a28",
            weight: 1.5,
            opacity: 0.9,
          }}
        />
      ))}
    </>
  )
}

function ResizeFix() {
  const map = useMap()
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 180)
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [map])
  return null
}

export default function WorldMap({
  pins,
  activePinKey,
  routeStops,
  pickEnabled,
  camera,
  onPinClick,
  onRouteStopClick,
  onPick,
}: WorldMapProps) {
  const cityPins = pins.filter((pin) => pin.cityId)
  const routePositions = routeStops.map((stop) => [stop.lat, stop.lng] as [number, number])
  const routePinsHidden = (pin: Pin) =>
    routeStops.some(
      (stop) => Math.abs(stop.lat - pin.lat) < 0.05 && Math.abs(stop.lng - pin.lng) < 0.05,
    )

  return (
    <MapContainer
      center={[24, 12]}
      zoom={2}
      minZoom={1}
      maxZoom={12}
      worldCopyJump={false}
      zoomControl={false}
      className={pickEnabled ? "is-picking h-full w-full" : "h-full w-full"}
      attributionControl
    >
      <TraditionalTiles />
      <ZoomControl position="topleft" />
      <ResizeFix />
      <CameraRig camera={camera} />
      <PickLayer enabled={pickEnabled} onPick={onPick} />
      <CityDiscs pins={cityPins} />
      {routePositions.length > 1 && (
        <>
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#fffaf3", weight: 8, opacity: 0.95 }}
          />
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#1f6f6a", weight: 3.5, opacity: 0.95 }}
          />
        </>
      )}
      <YearMarkers
        pins={pins.filter((pin) => !routePinsHidden(pin))}
        activePinKey={activePinKey}
        onPinClick={onPinClick}
      />
      {routeStops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={stopIcon(stop.index, stop.active, stopShift(stop, routeStops))}
          zIndexOffset={stop.active ? 1200 : 900}
          eventHandlers={{
            click: () => onRouteStopClick(stop.id),
          }}
        >
          <Tooltip direction="top" opacity={1}>
            {stop.index}. {stop.name}
          </Tooltip>
        </Marker>
      ))}
      </MapContainer>
  )
}
