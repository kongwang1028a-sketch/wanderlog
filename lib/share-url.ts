export function publicShareUrl(href: string) {
  const url = new URL(href)
  url.search = ""
  url.hash = ""
  if (url.pathname !== "/" && !url.pathname.endsWith("/")) url.pathname += "/"
  if (url.pathname === "/") return url.origin
  return url.toString()
}
