import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { feature } from "topojson-client"
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson"
import { splitPolygonsAtDateline } from "./antimeridian"

const topology = JSON.parse(readFileSync("public/geo/countries-50m.json", "utf8")) as {
  objects: { countries: object }
}
const countries = feature(topology as never, topology.objects.countries as never) as unknown as FeatureCollection

function jumps(ring: Position[]) {
  let count = 0
  for (let index = 1; index < ring.length; index += 1) {
    if (Math.abs(ring[index][0] - ring[index - 1][0]) > 180) count += 1
  }
  return count
}

const russia = countries.features.find((item) => String(item.id) === "643")
assert.ok(russia)
assert.ok(russia.geometry.type === "Polygon" || russia.geometry.type === "MultiPolygon")
const source = russia.geometry.type === "Polygon" ? [russia.geometry.coordinates] : russia.geometry.coordinates
const split = splitPolygonsAtDateline(source)
const splitRings = split.flat()
assert.ok(splitRings.length > source.flat().length)
assert.equal(splitRings.reduce((total, ring) => total + jumps(ring), 0), 0)
for (const ring of splitRings) {
  const first = ring[0]
  const last = ring[ring.length - 1]
  assert.ok(first && last)
  assert.equal(first[0], last[0])
  assert.equal(first[1], last[1])
  const width = Math.max(...ring.map((point) => point[0])) - Math.min(...ring.map((point) => point[0]))
  assert.ok(width < 180)
}

const untouched = countries.features.find((item) => String(item.id) === "276") as Feature<Polygon | MultiPolygon>
assert.ok(untouched.geometry.type === "Polygon" || untouched.geometry.type === "MultiPolygon")
const germany = untouched.geometry.type === "Polygon" ? [untouched.geometry.coordinates] : untouched.geometry.coordinates
assert.equal(splitPolygonsAtDateline(germany).length, germany.length)

console.log("all passed")
