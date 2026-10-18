"use client"

import { useEffect, useState, type ComponentType, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { accessToken, SITE_ACCESS_TOKEN, tokensMatch } from "@/lib/site-access"
import { clearAccess, hasAccess, saveRemember, saveSession } from "@/lib/site-gate"

type AppComponent = ComponentType<{ onLock: () => void }>

export function SiteGate() {
  const [status, setStatus] = useState<"checking" | "locked" | "open">("checking")
  const [App, setApp] = useState<AppComponent | null>(null)
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setStatus(hasAccess(localStorage, sessionStorage, Date.now()) ? "open" : "locked")
  }, [])

  useEffect(() => {
    if (status !== "open") {
      setApp(null)
      return
    }
    let cancel = false
    void import("@/components/travel-app").then((mod) => {
      if (!cancel) setApp(() => mod.TravelApp)
    })
    return () => {
      cancel = true
    }
  }, [status])

  function lock() {
    clearAccess(localStorage, sessionStorage)
    setPassword("")
    setError("")
    setStatus("locked")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const actual = await accessToken(password)
      if (!tokensMatch(actual, SITE_ACCESS_TOKEN)) {
        setError("密碼不對")
        return
      }
      if (remember) saveRemember(localStorage, sessionStorage, Date.now())
      else saveSession(sessionStorage, localStorage)
      setPassword("")
      setError("")
      setStatus("open")
    } finally {
      setPending(false)
    }
  }

  if (status === "open" && App) return <App onLock={lock} />

  if (status !== "locked") {
    return (
      <main className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        正在確認…
      </main>
    )
  }

  return (
    <main className="flex h-dvh items-center justify-center bg-background px-4">
      <section className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-terracotta text-lg text-white">旅</div>
        <h1 className="mt-4 font-display text-3xl">旅遊足跡</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">輸入密碼後才能看地圖和旅程。</p>
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-3">
          <input className="sr-only" type="text" name="username" autoComplete="username" defaultValue="wanderlog" tabIndex={-1} aria-hidden="true" />
          <label className="block space-y-2 text-sm" htmlFor="site-password">
            進入密碼
            <Input
              id="site-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              className="h-10 bg-card"
              onChange={(event) => {
                setPassword(event.target.value)
                setError("")
              }}
            />
          </label>
          <label className="flex items-start gap-2 text-sm leading-6" htmlFor="remember-password">
            <input
              id="remember-password"
              type="checkbox"
              className="mt-1 size-4 accent-terracotta"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>
              自動記住密碼
              <span className="mt-0.5 block text-xs text-muted-foreground">這台裝置一週內不用再輸入</span>
            </span>
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "確認中…" : "進入"}
          </Button>
        </form>
      </section>
    </main>
  )
}
