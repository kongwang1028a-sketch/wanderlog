import type { Trip } from "@/lib/types"

export type Party = {
  withGroup: boolean
  companions: string[]
}

export const PARTY: Record<string, Party> = {
  "tokyo-2016-feb": {
    withGroup: false,
    companions: ["丹丹吃漢堡", "ㄆㄆ", "阿閒", "ㄒㄒ", "ㄘㄘ", "梗梗"],
  },
  "japan-2018": {
    withGroup: false,
    companions: ["76", "DADA", "梗梗", "我廢"],
  },
  "japan-2019": {
    withGroup: false,
    companions: ["待待", "梗梗"],
  },
  "japan-dec-2024": {
    withGroup: false,
    companions: ["姊", "爸"],
  },
  "yokohama-kamakura-2026": {
    withGroup: false,
    companions: ["阿閒", "梗梗"],
  },
  "aurora-pacific-2026": {
    withGroup: true,
    companions: [],
  },
  "japan-jun-2023": {
    withGroup: false,
    companions: ["梗梗", "丹丹", "小咩(ㄒㄒ)"],
  },
}

export function partyFor(id: string): Party {
  return PARTY[id] ?? { withGroup: false, companions: [] }
}

export function splitCompanionNames(text: string) {
  const names: string[] = []
  for (const part of text.split(/[、,，;；\s]+/)) {
    const name = part.trim().slice(0, 24)
    if (!name || names.includes(name)) continue
    names.push(name)
  }
  return names
}

export function mergeCompanions(current: string[], incoming: string[]) {
  const next = [...current]
  for (const name of incoming) {
    if (!next.includes(name)) next.push(name)
  }
  return next.slice(0, 40)
}

export function companionAliases(name: string) {
  const aliases = [name]
  const wrapped = name.match(/^(.+?)\(([^()]+)\)$/)
  if (wrapped?.[1] && wrapped[2]) aliases.push(wrapped[1], wrapped[2])
  return aliases
}

export function companionMatches(companions: string[] | undefined, name: string) {
  return (companions ?? []).some((companion) => companionAliases(companion).includes(name))
}

export function companionNames(trips: Trip[]) {
  const counts = new Map<string, number>()
  for (const trip of trips) {
    for (const name of trip.companions ?? []) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
    .map(([name]) => name)
}
