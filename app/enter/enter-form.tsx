"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { unlockSite } from "./actions"

export function EnterForm() {
  const [state, action, pending] = useActionState(unlockSite, { error: "" })

  return (
    <form action={action} className="mt-6 space-y-3">
      <input className="sr-only" type="text" name="username" autoComplete="username" defaultValue="friend" tabIndex={-1} aria-hidden="true" />
      <label className="block space-y-2 text-sm" htmlFor="site-password">
        進入密碼
        <Input
          id="site-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 bg-card"
        />
      </label>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "確認中…" : "進入"}
      </Button>
    </form>
  )
}
