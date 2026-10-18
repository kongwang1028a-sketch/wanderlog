import assert from "node:assert/strict"
import { clearAccess, hasAccess, REMEMBER_KEY, REMEMBER_MS, saveRemember, saveSession, SESSION_KEY } from "./site-gate"

type Memory = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

function memory(): Memory {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const now = Date.parse("2026-10-18T00:00:00.000Z")
const local = memory()
const session = memory()

assert.equal(hasAccess(local, session, now), false)

saveRemember(local, session, now)
assert.equal(hasAccess(local, session, now + REMEMBER_MS - 1), true)
assert.equal(hasAccess(local, session, now + REMEMBER_MS), false)
assert.equal(local.getItem(REMEMBER_KEY), null)

saveRemember(local, session, now)
saveSession(session, local)
assert.equal(local.getItem(REMEMBER_KEY), null)
assert.equal(session.getItem(SESSION_KEY), "1")
assert.equal(hasAccess(local, session, now + REMEMBER_MS + 1), true)

clearAccess(local, session)
local.setItem(REMEMBER_KEY, "{")
assert.equal(hasAccess(local, session, now), false)
assert.equal(local.getItem(REMEMBER_KEY), null)

clearAccess(local, session)
assert.equal(hasAccess(local, session, now), false)

console.log("site-gate ok")
