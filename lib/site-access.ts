export const ACCESS_COOKIE = "travel-footprints-access"

export const SITE_ACCESS_TOKEN = "9bf477bdb2e3ef452c653d1a962e6a149dfd76a713962661243257eaec19c60f"

export const EDITOR_ACCESS_TOKEN = "608bdcdc5c667fd94297cba2c10716180455aa460ae8b355e8cd486fd79e121d"

export function sitePassword() {
  return process.env.SITE_PASSWORD?.trim() ?? ""
}

async function digestToken(prefix: string, password: string) {
  const data = new TextEncoder().encode(`${prefix}${password}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function accessToken(password: string) {
  return digestToken("travel-footprints:", password)
}

export function editorToken(password: string) {
  return digestToken("travel-footprints-edit:", password)
}

export function tokensMatch(left: string, right: string) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}
