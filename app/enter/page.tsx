import { Suspense } from "react"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { sitePassword } from "@/lib/site-access"
import { EnterForm } from "./enter-form"

export default function EnterPage() {
  return (
    <Suspense fallback={<main className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">正在確認…</main>}>
      <EnterGate />
    </Suspense>
  )
}

async function EnterGate() {
  await connection()
  if (!sitePassword()) redirect("/")

  return (
    <main className="flex h-full items-center justify-center bg-background px-4">
      <section className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-terracotta text-lg text-white">旅</div>
        <h1 className="mt-4 font-display text-3xl">私人地圖</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          這份地圖沒有公開。請輸入你們約好的密碼。進去之後，旅程仍然只存在你的瀏覽器，不會跟朋友的紀錄混在一起。
        </p>
        <EnterForm />
      </section>
    </main>
  )
}
