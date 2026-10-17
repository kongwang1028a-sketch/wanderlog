type Position = number[]
type Ring = Position[]
type Polygon = Ring[]

function datelineLatitude(a: Position, b: Position) {
  const positive = a[0] > 0 ? a : b
  const negative = a[0] > 0 ? b : a
  const span = 180 - positive[0] + (negative[0] + 180)
  if (span === 0) return positive[1]
  const t = (180 - positive[0]) / span
  return positive[1] + t * (negative[1] - positive[1])
}

function samePoint(a: Position, b: Position) {
  return a[0] === b[0] && a[1] === b[1]
}

export function splitRingAtDateline(ring: Ring): Ring[] {
  const cuts: number[] = []
  for (let index = 1; index < ring.length; index += 1) {
    if (Math.abs(ring[index][0] - ring[index - 1][0]) > 180) cuts.push(index)
  }
  if (cuts.length !== 2) return [ring]

  const [firstCut, secondCut] = cuts
  const enter = ring[firstCut]
  const latEnter = datelineLatitude(ring[firstCut - 1], enter)
  const latLeave = datelineLatitude(ring[secondCut - 1], ring[secondCut])
  const middleIsNegative = enter[0] < 0
  const outerEdge = middleIsNegative ? 180 : -180
  const innerEdge = middleIsNegative ? -180 : 180

  const outer: Ring = ring.slice(0, firstCut)
  outer.push([outerEdge, latEnter], [outerEdge, latLeave], ...ring.slice(secondCut))
  if (!samePoint(outer[0], outer[outer.length - 1])) outer.push(outer[0])

  const inner: Ring = [
    [innerEdge, latEnter],
    ...ring.slice(firstCut, secondCut),
    [innerEdge, latLeave],
    [innerEdge, latEnter],
  ]
  return [outer, inner]
}

export function splitPolygonsAtDateline(polygons: Polygon[]): Polygon[] {
  const next: Polygon[] = []
  for (const polygon of polygons) {
    const [outer, ...holes] = polygon
    if (!outer) continue
    const pieces = splitRingAtDateline(outer)
    if (pieces.length === 1 || holes.length > 0) {
      next.push(polygon)
      continue
    }
    next.push(...pieces.map((piece) => [piece]))
  }
  return next
}
