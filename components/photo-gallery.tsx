"use client"

import { useEffect, useState } from "react"
import { Cloud, ExternalLink, ImageOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { photoKindLabel } from "@/lib/format"
import { getPhotoBlob } from "@/lib/storage"
import type { PhotoRef } from "@/lib/types"

export function PhotoGallery({
  photos,
  focusStopId,
}: {
  photos: PhotoRef[]
  focusStopId?: string | null
}) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [missing, setMissing] = useState<Record<string, boolean>>({})
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null)

  const uploadKey = photos
    .filter((photo) => photo.kind === "upload")
    .map((photo) => photo.id)
    .join("|")

  useEffect(() => {
    let cancelled = false
    const created: string[] = []
    const uploads = photos.filter((photo) => photo.kind === "upload")
    ;(async () => {
      const nextUrls: Record<string, string> = {}
      const nextMissing: Record<string, boolean> = {}
      for (const photo of uploads) {
        const blob = await getPhotoBlob(photo.id)
        if (!blob) {
          nextMissing[photo.id] = true
          continue
        }
        const url = URL.createObjectURL(blob)
        created.push(url)
        nextUrls[photo.id] = url
      }
      if (!cancelled) {
        setUrls(nextUrls)
        setMissing(nextMissing)
      }
    })()
    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
    // uploadKey captures the upload ids for this gallery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadKey])

  if (photos.length === 0) {
    return (
      <p className="rounded-2xl bg-secondary px-3 py-4 text-sm leading-6 text-muted-foreground">
        這趟還沒有照片。編輯旅程時可以上傳圖片，或貼上 Google 雲端、iCloud 的分享連結。
      </p>
    )
  }

  const focused = focusStopId
    ? photos.filter((photo) => !photo.stopId || photo.stopId === focusStopId)
    : photos
  const visible = focused.length > 0 ? focused : photos

  return (
    <>
      {focusStopId && focused.length !== photos.length && (
        <p className="mb-2 text-xs text-muted-foreground">
          先顯示這站與整趟旅程的照片。
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {visible.map((photo) => {
          if (photo.kind === "upload") {
            const url = urls[photo.id]
            return (
              <button
                key={photo.id}
                type="button"
                className="group overflow-hidden rounded-2xl bg-secondary text-left"
                onClick={() => {
                  if (url) setLightbox({ url, caption: photo.caption })
                }}
              >
                {url ? (
                  // Blob URLs cannot go through next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={photo.caption || "旅遊照片"} className="aspect-square w-full object-cover" />
                ) : (
                  <span className="flex aspect-square items-center justify-center text-muted-foreground">
                    <ImageOff className="size-5" />
                    <span className="sr-only">{missing[photo.id] ? "找不到照片" : "載入中"}</span>
                  </span>
                )}
                {photo.caption && (
                  <span className="block px-2 py-1.5 text-xs leading-5">{photo.caption}</span>
                )}
              </button>
            )
          }

          return (
            <a
              key={photo.id}
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-28 flex-col justify-between rounded-2xl border bg-card p-3 transition-colors hover:bg-secondary"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-sea">
                {photo.kind === "web" ? <ExternalLink className="size-3.5" /> : <Cloud className="size-3.5" />}
                {photoKindLabel(photo.kind)}
              </span>
              <span className="mt-3 line-clamp-3 text-sm leading-5">
                {photo.caption || "開啟分享連結"}
              </span>
              <Badge variant="secondary" className="mt-3 w-fit">
                在新分頁開啟
              </Badge>
            </a>
          )
        })}
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#1c1612]/88 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption || "照片"}
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.caption || "旅遊照片"}
            className="max-h-[80vh] max-w-full rounded-xl object-contain"
          />
          {lightbox.caption && (
            <p className="mt-3 max-w-lg text-center text-sm text-[#f6f1e7]">{lightbox.caption}</p>
          )}
          <p className="mt-2 text-xs text-[#f6f1e7]/70">點一下關閉</p>
        </div>
      )}
    </>
  )
}
