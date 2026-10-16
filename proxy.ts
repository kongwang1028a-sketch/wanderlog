import { NextResponse, type NextRequest } from "next/server"
import { ACCESS_COOKIE, accessToken, sitePassword, tokensMatch } from "@/lib/site-access"

export async function proxy(request: NextRequest) {
  const password = sitePassword()
  if (!password) return NextResponse.next()

  const response = request.nextUrl.pathname === "/enter" ? NextResponse.next() : await gate(request, password)
  response.headers.set("X-Robots-Tag", "noindex, nofollow")
  return response
}

async function gate(request: NextRequest, password: string) {
  const expected = await accessToken(password)
  const given = request.cookies.get(ACCESS_COOKIE)?.value ?? ""
  if (given && tokensMatch(given, expected)) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = "/enter"
  url.search = ""
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|webp|json|ico)$).*)"],
}
