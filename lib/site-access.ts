export const ACCESS_COOKIE = "travel-footprints-access"

export function sitePassword() {
  return process.env.SITE_PASSWORD?.trim() ?? ""
}

export async function accessToken(password: string) {
  const data = new TextEncoder().encode(`travel-footprints:${password}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function tokensMatch(left: string, right: string) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}
