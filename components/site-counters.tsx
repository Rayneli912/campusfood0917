"use client"

import { useEffect, useState } from "react"
import { COUNTERS_UPDATED, getCounters, incrementViewsOncePerVisit, type SiteCounters } from "@/lib/counters-service"

export default function SiteCounters() {
  const [data, setData] = useState<SiteCounters | null>(null)

  useEffect(() => {
    // 首頁載入時，這次造訪 +1（只加一次；只在客戶端）
    incrementViewsOncePerVisit()

    // 讀取最新值
    setData(getCounters())

    const onUpdate = (e: any) => {
      if (e?.detail) setData(e.detail as SiteCounters)
      else setData(getCounters())
    }
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (e.key === "siteCounters" || e.key === "siteCounters:__touch__") {
        setData(getCounters())
      }
    }

    window.addEventListener(COUNTERS_UPDATED, onUpdate as EventListener)
    window.addEventListener("storage", onStorage)

    return () => {
      window.removeEventListener(COUNTERS_UPDATED, onUpdate as EventListener)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  // 尚未 mounted：避免 hydration mismatch（顯示穩定的 placeholder）
  if (!data) {
    return (
      <section className="w-full border-t bg-muted/30">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <div className="text-2xl font-semibold tracking-tight">網站瀏覽人次：</div>
            <div className="text-4xl font-extrabold tabular-nums">—</div>

            <div className="h-3" />

            <div className="text-2xl font-semibold tracking-tight">已減少 — 次糧食浪費</div>
            <div className="text-sm text-muted-foreground">最後更新：—</div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full border-t bg-muted/30">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-xl mx-auto text-center space-y-3">
          <div className="text-2xl font-semibold tracking-tight">網站瀏覽人次：</div>
          <div className="text-4xl font-extrabold tabular-nums">{data.views.toLocaleString()}</div>

          <div className="h-3" />

          <div className="text-2xl font-semibold tracking-tight">
            已減少 {data.wasteSaved.toLocaleString()} 次糧食浪費
          </div>
          {/* 這裡是客戶端才會渲染，不會觸發 SSR/CSR 差異 */}
          <div className="text-sm text-muted-foreground">
            最後更新：{new Date(data.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </section>
  )
}
