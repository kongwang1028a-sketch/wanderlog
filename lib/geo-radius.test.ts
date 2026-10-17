import assert from "node:assert/strict"
import { cityRadiusMeters } from "./geo"

const osaka = 34.69

const close = cityRadiusMeters(osaka, 8)
assert.equal(close, 15_000)

const world = cityRadiusMeters(osaka, 2)
const metersPerPixel = (156543.03392 * Math.cos((osaka * Math.PI) / 180)) / 4
assert.ok(world > 15_000)
assert.ok(Math.abs(world / metersPerPixel - 5) < 0.01)
assert.ok(world < 250_000)
