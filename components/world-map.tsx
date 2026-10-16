"use client"

import { useEffect, useMemo, useState } from "react"
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet"
import L from "leaflet"
import type { Feature, FeatureCollection, Geometry } from "geojson"
import { feature } from "topojson-client"
import "leaflet/dist/leaflet.css"
import { flagEmoji } from "@/lib/geo"
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
  visitedIds: string[]
  pickEnabled: boolean
  camera: Camera
  onPinClick: (key: string) => void
  onRouteStopClick: (id: string) => void
  onPick: (lat: number, lng: number) => void
}

function flagIcon(code: string, active: boolean, count: number) {
  const badge = count > 1 ? `<span class="flag-count">${count}</span>` : ""
  return L.divIcon({
    className: "flag-marker",
    html: `<div class="flag-pin${active ? " is-active" : ""}"><span class="flag-pennant" aria-hidden="true">${flagEmoji(code)}</span><span class="flag-pole"></span>${badge}</div>`,
    iconSize: [44, 50],
    iconAnchor: [8, 48],
    tooltipAnchor: [14, -42],
  })
}

function stopIcon(index: number, active: boolean) {
  return L.divIcon({
    className: "stop-marker",
    html: `<div class="stop-badge${active ? " is-active" : ""}">${index}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
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

function featureNumericId(item: Feature) {
  if (item.id === undefined || item.id === null) return ""
  return String(item.id).padStart(3, "0")
}

export default function WorldMap({
  pins,
  activePinKey,
  routeStops,
  visitedIds,
  pickEnabled,
  camera,
  onPinClick,
  onRouteStopClick,
  onPick,
}: WorldMapProps) {
  const [countries, setCountries] = useState<FeatureCollection<Geometry> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/geo/countries-50m.json")
      .then((response) => {
        if (!response.ok) throw new Error("geo")
        return response.json() as Promise<{ objects: { countries: object } }>
      })
      .then((topology) => {
        if (cancelled) return
        const collection = feature(
          topology as never,
          topology.objects.countries as never,
        ) as unknown as FeatureCollection<Geometry>
        setCountries(collection)
      })
      .catch(() => {
        // Flags and routes still work if the country shapes cannot load.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visited = useMemo(() => new Set(visitedIds), [visitedIds])
  const visitedGeo = useMemo(() => {
    if (!countries) return null
    const features = countries.features.filter((item) => visited.has(featureNumericId(item)))
    return { type: "FeatureCollection" as const, features }
  }, [countries, visited])

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
      <TileLayer
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, OSM"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
      />
      <ZoomControl position="topleft" />
      <ResizeFix />
      <CameraRig camera={camera} />
      <PickLayer enabled={pickEnabled} onPick={onPick} />
      {visitedGeo && visitedGeo.features.length > 0 && (
        <GeoJSON
          key={visitedIds.slice().sort().join(",")}
          data={visitedGeo}
          interactive={false}
          style={() => ({
            fillColor: "#c4553a",
            fillOpacity: 0.42,
            color: "#8c3a28",
            weight: 1,
          })}
        />
      )}
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
      {pins
        .filter((pin) => !routePinsHidden(pin))
        .map((pin) => (
          <Marker
            key={pin.key}
            position={[pin.lat, pin.lng]}
            icon={flagIcon(pin.countryCode, pin.key === activePinKey, pin.visits.length)}
            zIndexOffset={pin.key === activePinKey ? 800 : 0}
            eventHandlers={{
              click: () => onPinClick(pin.key),
            }}
          >
            <Tooltip direction="top" opacity={1}>
              <span className="font-medium">{pin.name}</span>
              <span className="text-muted-foreground"> · {pin.country}</span>
            </Tooltip>
          </Marker>
        ))}
      {routeStops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={stopIcon(stop.index, stop.active)}
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
