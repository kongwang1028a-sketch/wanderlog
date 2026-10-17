import assert from "node:assert/strict"
import { decideLiveSync, tripSignature } from "./live-book"
import type { Trip } from "./types"

const base = {
  id: "aurora-pacific-2026",
  title: "美加極光海陸旅行團",
  startDate: "2026-09-19",
  endDate: "2026-10-03",
  notes: "",
  stops: [],
  flights: [],
  stays: [],
  photos: [],
  createdAt: "2026-09-01T00:00:00.000Z",
} satisfies Trip

const renamed = { ...base, title: "2026年9月 美加極光" }

assert.equal(tripSignature([base]), tripSignature([{ ...base, createdAt: "2026-09-01T00:00:00Z" }]))
assert.notEqual(tripSignature([base]), tripSignature([renamed]))

const local = tripSignature([renamed])
const published = tripSignature([base])

assert.equal(
  decideLiveSync({
    localSignature: local,
    staticSignature: published,
    remoteSignature: published,
    localEditedAt: 0,
    remoteEditedAt: Date.parse("2026-10-17T14:20:00.000Z"),
  }),
  "push",
)

assert.equal(
  decideLiveSync({
    localSignature: published,
    staticSignature: published,
    remoteSignature: published,
    localEditedAt: 0,
    remoteEditedAt: Date.parse("2026-10-17T14:20:00Z"),
  }),
  "none",
)

assert.equal(
  decideLiveSync({
    localSignature: published,
    staticSignature: published,
    remoteSignature: local,
    localEditedAt: 0,
    remoteEditedAt: Date.parse("2026-10-17T16:00:00.000Z"),
  }),
  "pull",
)

assert.equal(
  decideLiveSync({
    localSignature: local,
    staticSignature: published,
    remoteSignature: published,
    localEditedAt: Date.parse("2026-10-17T16:30:00.000Z"),
    remoteEditedAt: Date.parse("2026-10-17T16:00:00.000Z"),
  }),
  "push",
)

assert.equal(
  decideLiveSync({
    localSignature: published,
    staticSignature: published,
    remoteSignature: local,
    localEditedAt: Date.parse("2026-10-17T16:00:00.000Z"),
    remoteEditedAt: Date.parse("2026-10-17T16:30:00.000Z"),
  }),
  "pull",
)

assert.equal(
  decideLiveSync({
    localSignature: local,
    staticSignature: published,
    remoteSignature: null,
    localEditedAt: 0,
    remoteEditedAt: 0,
  }),
  "push",
)

assert.equal(
  decideLiveSync({
    localSignature: local,
    staticSignature: published,
    remoteSignature: tripSignature([{ ...renamed, title: "另一台改的" }]),
    localEditedAt: 0,
    remoteEditedAt: Date.parse("2026-10-17T16:40:00.000Z"),
  }),
  "pull",
)
