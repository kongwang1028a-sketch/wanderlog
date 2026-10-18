import assert from "node:assert/strict"
import { companionNames, mergeCompanions, partyFor, splitCompanionNames } from "./companions"
import { createAuroraTrip } from "./aurora-trip"
import { createJapan2018Trip } from "./japan-2018-tokyo-trip"
import { createJapan2019Trip } from "./japan-2019-trip"
import { createJapanDecemberTrip } from "./japan-dec-trip"
import { createTokyo2016FebTrip } from "./tokyo-2016-feb-trip"
import { createYokohamaTrip } from "./yokohama-trip"

assert.deepEqual(splitCompanionNames("阿閒、梗梗，姊 爸"), ["阿閒", "梗梗", "姊", "爸"])
assert.deepEqual(mergeCompanions(["阿閒"], ["梗梗", "阿閒"]), ["阿閒", "梗梗"])

const trips = [
  createTokyo2016FebTrip(),
  createJapan2018Trip(),
  createJapan2019Trip(),
  createJapanDecemberTrip(),
  createYokohamaTrip(),
  createAuroraTrip(),
].filter((trip) => trip !== null)

assert.deepEqual(partyFor("tokyo-2016-feb").companions, ["丹丹吃漢堡", "ㄆㄆ", "阿閒", "ㄒㄒ", "ㄘㄘ", "梗梗"])
assert.deepEqual(trips.find((trip) => trip.id === "japan-2018")?.companions, ["76", "DADA", "梗梗", "我廢"])
assert.deepEqual(trips.find((trip) => trip.id === "japan-2019")?.companions, ["待待", "梗梗"])
assert.deepEqual(trips.find((trip) => trip.id === "japan-dec-2024")?.companions, ["姊", "爸"])
assert.deepEqual(trips.find((trip) => trip.id === "yokohama-kamakura-2026")?.companions, ["阿閒", "梗梗"])
assert.equal(trips.find((trip) => trip.id === "aurora-pacific-2026")?.withGroup, true)
assert.deepEqual(trips.find((trip) => trip.id === "aurora-pacific-2026")?.companions, [])
assert.equal(
  trips.filter((trip) => trip.companions?.includes("梗梗")).length,
  4,
)
assert.equal(companionNames(trips)[0], "梗梗")
console.log("all passed")
