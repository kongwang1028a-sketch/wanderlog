export const REMEMBER_KEY = "travel-footprints-remember-v1"
export const SESSION_KEY = "travel-footprints-session-v1"
export const EDITOR_REMEMBER_KEY = "travel-footprints-editor-remember-v1"
export const EDITOR_SESSION_KEY = "travel-footprints-editor-session-v1"
export const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

export type GateKeys = { remember: string; session: string }

export const VIEW_GATE: GateKeys = { remember: REMEMBER_KEY, session: SESSION_KEY }
export const EDITOR_GATE: GateKeys = { remember: EDITOR_REMEMBER_KEY, session: EDITOR_SESSION_KEY }

export function saveRemember(local: Store, session: Store, now: number, keys: GateKeys = VIEW_GATE) {
  session.removeItem(keys.session)
  local.setItem(keys.remember, JSON.stringify({ until: now + REMEMBER_MS }))
}

export function saveSession(session: Store, local: Store, keys: GateKeys = VIEW_GATE) {
  local.removeItem(keys.remember)
  session.setItem(keys.session, "1")
}

export function clearAccess(local: Store, session: Store, keys: GateKeys = VIEW_GATE) {
  local.removeItem(keys.remember)
  session.removeItem(keys.session)
}

export function hasAccess(local: Store, session: Store, now: number, keys: GateKeys = VIEW_GATE) {
  const raw = local.getItem(keys.remember)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { until?: unknown }
      if (typeof parsed.until === "number" && parsed.until > now) return true
    } catch {
      // 舊資料壞掉就當成沒記住。
    }
    local.removeItem(keys.remember)
  }
  return session.getItem(keys.session) === "1"
}
