"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface PhotoViewerDialogProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
  initialIndex?: number
}

export function PhotoViewerDialog({ isOpen, onClose, images, initialIndex = 0 }: PhotoViewerDialogProps) {
  const [index, setIndex] = useState(initialIndex)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const src = images?.[index] || ""

  useEffect(() => {
    setIndex(initialIndex)
    setZoom(false)
  }, [initialIndex, isOpen])

  const dims = useMemo(() => {
    const vw = typeof window !== "undefined" ? Math.floor(window.innerWidth * 0.9) : 1000
    const vh = typeof window !== "undefined" ? Math.floor(window.innerHeight * 0.9) : 800
    if (!natural) return { width: Math.min(vw, vh), height: Math.min(vw, vh) }
    const { w, h } = natural
    const r = w / h
    const viewR = vw / vh
    if (r > viewR) {
      const width = vw
      return { width, height: Math.min(vh, Math.round(width / r)) }
    } else {
      const height = vh
      return { height, width: Math.min(vw, Math.round(height * r)) }
    }
  }, [natural, isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-black/90 border-black/50">
        <DialogTitle className="sr-only">圖片檢視</DialogTitle>
        <div
          className="relative mx-auto my-4 overflow-auto rounded-lg"
          style={{
            width: zoom ? "90vw" : `${dims.width}px`,
            height: zoom ? "90vh" : `${dims.height}px`,
          }}
          onClick={() => setZoom(z => !z)}
        >
          {src ? (
            <img
              ref={imgRef}
              src={src}
              alt="post-image"
              className="block select-none"
              onLoad={(e) => {
                const el = e.currentTarget
                setNatural({ w: el.naturalWidth || 1, h: el.naturalHeight || 1 })
              }}
              style={
                zoom
                  ? { width: "auto", height: "auto", maxWidth: "none", maxHeight: "none" }
                  : { width: "100%", height: "100%", objectFit: "contain" }
              }
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-white/80">無圖片</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
