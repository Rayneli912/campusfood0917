"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getCounters,
  setCounters,
  resetCounters,
  bumpViews,
  bumpWaste,
  COUNTERS_UPDATED,
  type SiteCounters,
  setWasteMode,
  setWasteOffset,
  type WasteMode,
} from "@/lib/counters-service"

export default function CountersPanel() {
  const [data, setData] = useState<SiteCounters>(getCounters())
  const [views, setViews] = useState<string>(String(data.views))
  const [waste, setWaste] = useState<string>(String(data.wasteSaved))
  const [mode, setMode] = useState<WasteMode>((data.calcMode as WasteMode) || "manual")
  const [offset, setOffset] = useState<string>(String(data.wasteOffset ?? 0))
  const [saving, setSaving] = useState(false)

  // 即時讀「完成訂單數」
  const completedOrders = useMemo(() => {
    try {
      const raw = localStorage.getItem("orders")
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr.filter((o: any) => String(o.status) === "completed").length : 0
    } catch { return 0 }
  }, [data.updatedAt]) // 每次 counters 更新時也重算，夠用了

  useEffect(() => {
    const onUpdate = () => {
      const latest = getCounters()
      setData(latest)
      setViews(String(latest.views))
      setWaste(String(latest.wasteSaved))
      setMode((latest.calcMode as WasteMode) || "manual")
      setOffset(String(latest.wasteOffset ?? 0))
    }
    window.addEventListener(COUNTERS_UPDATED, onUpdate as EventListener)
    onUpdate()
    return () => window.removeEventListener(COUNTERS_UPDATED, onUpdate as EventListener)
  }, [])

  const save = () => {
    setSaving(true)
    // 這裡沿用 setCounters：在自動模式下，waste 被視為「目標顯示值」，會自動轉成 offset
    const next = setCounters({
      views: Number(views) || 0,
      wasteSaved: Number(waste) || 0,
      calcMode: mode,
    })
    setSaving(false)
    setData(next)
  }

  const doReset = () => {
    const next = resetCounters()
    setData(next)
    setViews(String(next.views))
    setWaste(String(next.wasteSaved))
    setMode((next.calcMode as WasteMode) || "manual")
    setOffset(String(next.wasteOffset ?? 0))
  }

  const switchMode = (m: WasteMode) => {
    setWasteMode(m)
    const latest = getCounters()
    setData(latest)
    setMode((latest.calcMode as WasteMode) || "manual")
    setWaste(String(latest.wasteSaved))
    setOffset(String(latest.wasteOffset ?? 0))
  }

  const saveOffsetOnly = () => {
    setWasteOffset(Number(offset) || 0)
    const latest = getCounters()
    setData(latest)
    setWaste(String(latest.wasteSaved))
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle>計數器管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 模式切換 */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">計算模式</div>
          <div className="flex gap-2">
            <Button type="button" variant={mode === "manual" ? "default" : "outline"} onClick={() => switchMode("manual")}>
              手動
            </Button>
            <Button
              type="button"
              variant={mode === "completedOrders" ? "default" : "outline"}
              onClick={() => switchMode("completedOrders")}
            >
              自動（完成訂單數）
            </Button>
          </div>
        </div>

        {/* 站點瀏覽人次 */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">網站瀏覽人次</div>
          <div className="flex gap-2">
            <Input
              value={views}
              onChange={(e) => setViews(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
            />
            <Button type="button" variant="outline" onClick={() => setViews(String(Math.max(0, Number(views || 0) - 1)))}>
              −1
            </Button>
            <Button type="button" variant="outline" onClick={() => setViews(String(Number(views || 0) + 1))}>
              +1
            </Button>
            <Button type="button" onClick={() => setData(bumpViews(1))}>立即增加</Button>
          </div>
        </div>

        {/* 糧食浪費（手動 or 自動） */}
        {mode === "manual" ? (
          <div>
            <div className="text-sm text-muted-foreground mb-1">已減少糧食浪費（次）</div>
            <div className="flex gap-2">
              <Input
                value={waste}
                onChange={(e) => setWaste(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
              />
              <Button type="button" variant="outline" onClick={() => setWaste(String(Math.max(0, Number(waste || 0) - 1)))}>
                −1
              </Button>
              <Button type="button" variant="outline" onClick={() => setWaste(String(Number(waste || 0) + 1))}>
                +1
              </Button>
              <Button type="button" onClick={() => setData(bumpWaste(1))}>立即增加</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              目前完成訂單數：<span className="font-medium">{completedOrders}</span>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                偏移量（顯示值 = 完成訂單數 + 偏移量）
              </div>
              <div className="flex gap-2">
                <Input
                  value={offset}
                  onChange={(e) => setOffset(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                />
                <Button type="button" variant="outline" onClick={() => setOffset(String(Math.max(0, Number(offset || 0) - 1)))}>
                  −1
                </Button>
                <Button type="button" variant="outline" onClick={() => setOffset(String(Number(offset || 0) + 1))}>
                  +1
                </Button>
                <Button type="button" onClick={saveOffsetOnly}>儲存偏移量</Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              目前顯示值：<span className="font-semibold">{data.wasteSaved}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? "儲存中..." : "儲存數值"}</Button>
          <Button variant="outline" onClick={doReset}>一鍵重置</Button>
        </div>

        <div className="text-xs text-muted-foreground">
          最後更新：{new Date(data.updatedAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}
