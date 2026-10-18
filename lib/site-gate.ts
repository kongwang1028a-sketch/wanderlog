export const REMEMBER_KEY = "travel-footprints-remember-v1"
export const SESSION_KEY = "travel-footprints-session-v1"
export const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function saveRemember(local: Store, session: Store, now: number) {
  session.removeItem(SESSION_KEY)
  local.setItem(REMEMBER_KEY, JSON.stringify({ until: now + REMEMBER_MS }))
}

export function saveSession(session: Store, local: Store) {
  local.removeItem(REMEMBER_KEY)
  session.setItem(SESSION_KEY, "1")
}

export function clearAccess(local: Store, session: Store) {
  local.removeItem(REMEMBER_KEY)
  session.removeItem(SESSION_KEY)
}

export function hasAccess(local: Store, session: Store, now: number) {
  const raw = local.getItem(REMEMBER_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { until?: unknown }
      if (typeof parsed.until === "number" && parsed.until > now) return true
    } catch {
      // 舊資料壞掉就當成沒記住。
    }
    local.removeItem(REMEMBER_KEY)
  }
  return session.getItem(SESSION_KEY) === "1"
}
