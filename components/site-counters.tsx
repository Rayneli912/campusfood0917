"use client"

import { useEffect, useState } from "react"
import { getCounters, incrementViews, subscribeToCounters, type CounterData } from "@/lib/counter-db-service"

export default function SiteCounters() {
  const [data, setData] = useState<CounterData | null>(null)
  const [hasIncremented, setHasIncremented] = useState(false)

  useEffect(() => {
    // 載入計數器數據
    async function loadData() {
      const counters = await getCounters()
      if (counters) {
        setData(counters)
      }
    }
    
    loadData()

    // 只增加一次瀏覽次數（每次頁面載入）
    if (!hasIncremented) {
      incrementViews()
      setHasIncremented(true)
    }

    // 訂閱計數器變更
    const unsubscribe = subscribeToCounters((newData) => {
      setData(newData)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // 尚未載入數據時顯示載入狀態
  if (!data) {
    return (
      <section className="w-full border-t bg-muted/30">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <div className="text-2xl font-semibold tracking-tight">網站瀏覽次數：</div>
            <div className="text-4xl font-extrabold tabular-nums">—</div>

            <div className="h-3" />

            <div className="text-2xl font-semibold tracking-tight">已減少 — 次糧食浪費</div>
            <div className="text-sm text-muted-foreground">載入中...</div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full border-t bg-muted/30">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-xl mx-auto text-center space-y-3">
          <div className="text-2xl font-semibold tracking-tight">網站瀏覽次數：</div>
          <div className="text-4xl font-extrabold tabular-nums">{data.views.toLocaleString()}</div>

          <div className="h-3" />

          <div className="text-2xl font-semibold tracking-tight">
            已減少 {data.waste_saved.toLocaleString()} 次糧食浪費
          </div>
          <div className="text-sm text-muted-foreground">
            最後更新：{new Date(data.updated_at).toLocaleString("zh-TW")}
          </div>
        </div>
      </div>
    </section>
  )
}
