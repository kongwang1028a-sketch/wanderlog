"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatRange } from "@/lib/format"
import { parseMemoryList, sameMemory, type MemoryTrip } from "@/lib/memory-list"
import type { Trip } from "@/lib/types"

const PLACEHOLDER = `2019 朱諾、黃刀鎮
2023年7月 福岡
2024/11/2-11/7 大阪、京都、奈良
巴黎、倫敦`

export function MemoryImportDialog({
  open,
  onOpenChange,
  existing,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: Trip[]
  onAdd: (trips: MemoryTrip[]) => void
}) {
  const [text, setText] = useState("")
  const parsed = useMemo(() => parseMemoryList(text), [text])
  const fresh = parsed.trips.filter((trip) => !existing.some((item) => sameMemory(trip, item)))
  const duplicates = parsed.trips.length - fresh.length

  function add() {
    if (fresh.length === 0) return
    onAdd(fresh)
    setText("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>一次補上很多趟</DialogTitle>
          <DialogDescription>
            想不起每天的行程也沒關係。一行寫一趟，有年份最好，城市用頓號分開。
          </DialogDescription>
        </DialogHeader>
        <Textarea
          id="memory-list"
          value={text}
          maxLength={20000}
          placeholder={PLACEHOLDER}
          className="min-h-36 bg-card"
          onChange={(event) => setText(event.target.value)}
        />
        {text.trim() ? (
          <div className="max-h-48 space-y-2 overflow-y-auto text-sm leading-6">
            <p>{parsed.summary}</p>
            {fresh.map((trip) => (
              <p key={`${trip.line}-${trip.startDate}`}>
                <span className="text-gold">{formatRange(trip.startDate, trip.endDate) || "年份待補"}</span>
                <span className="mx-2">{trip.title}</span>
                <span className="text-muted-foreground">{trip.cities.map((city) => city.zh).join(" → ")}</span>
              </p>
            ))}
            {duplicates > 0 ? <p className="text-muted-foreground">有 {duplicates} 趟已經在列表裡，會略過。</p> : null}
            {parsed.skipped.length > 0 ? (
              <ul className="list-disc pl-4 text-xs leading-5 text-muted-foreground">
                {parsed.skipped.slice(0, 6).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={add} disabled={fresh.length === 0}>
            {fresh.length > 0 ? `加入 ${fresh.length} 趟` : "加入旅程"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
