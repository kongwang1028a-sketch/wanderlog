"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ACCESS_COOKIE, accessToken, sitePassword, tokensMatch } from "@/lib/site-access"

export async function unlockSite(_current: { error: string }, formData: FormData) {
  const password = sitePassword()
  const given = String(formData.get("password") ?? "")
  if (!password) redirect("/")
  const expected = await accessToken(password)
  const actual = await accessToken(given)
  if (!tokensMatch(expected, actual)) return { error: "密碼不對" }

  const jar = await cookies()
  jar.set(ACCESS_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  })
  redirect("/")
}
