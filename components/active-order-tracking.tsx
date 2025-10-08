"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const PICKUP_WINDOW_SECS = 10 * 60 // 10 分鐘

type OrderItem = { id?: string; foodItemId?: string; name: string; price: number; quantity: number; storeId?: string }
type Order = {
  id: string
  userId: string
  storeId: string
  storeName?: string
  status: "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected"
  createdAt: string
  updatedAt?: string
  acceptedAt?: string
  preparedAt?: string
  completedAt?: string
  cancelledAt?: string
  rejectedAt?: string
  items: OrderItem[]
  total: number
  customerInfo?: { name?: string; phone?: string; email?: string }
  note?: string
}

async function fetchOrder(orderId: string): Promise<Order | null> {
  try {
    // ✅ 强制使用数据库 API
    console.log("📥 订单追踪：获取订单详情，orderId:", orderId)
    
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { 
      method: "GET",
      cache: "no-store" 
    })
    
    if (!res.ok) {
      console.error("❌ 获取订单详情失败:", res.status)
      return null
    }
    
    const json = await res.json()
    console.log("✅ 订单追踪：订单数据:", json)
    
    if (!json.success || !json.order) {
      console.error("❌ 订单数据格式错误:", json)
      return null
    }
    
    // 转换数据格式
    const order = json.order
    return {
      id: order.id,
      userId: order.userId,
      storeId: order.storeId,
      storeName: order.storeName,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      acceptedAt: order.acceptedAt,
      preparedAt: order.preparedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      rejectedAt: order.rejectedAt,
      items: order.items || [],
      total: Number(order.total || 0),
      customerInfo: order.customerInfo,
      note: order.note,
    }
  } catch (error) {
    console.error("❌ 订单追踪：获取订单错误:", error)
    return null
  }
}

// ✅ 已移除 updateOrderLocal 和 tryRestockItems 函数
// 所有订单更新操作都通过数据库 API 进行

function fmt(t?: string) { return t ? new Date(t).toLocaleString() : undefined }

export default function ActiveOrderTracking({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  // 倒數
  const [left, setLeft] = useState(0)
  const [progress, setProgress] = useState(0)
  const [near, setNear] = useState(false)
  const [running, setRunning] = useState(false)
  const tickRef = useRef<number | null>(null)

  const reload = async () => {
    setLoading(true)
    const o = await fetchOrder(orderId)
    setOrder(o)
    setLoading(false)
  }

  useEffect(() => { reload() }, [orderId])

  // 後台/店家狀態更新 → 即時刷新
  useEffect(() => {
    const h = () => reload()
    window.addEventListener("orderStatusUpdated", h as EventListener)
    return () => window.removeEventListener("orderStatusUpdated", h as EventListener)
  }, [orderId])

  // 啟動/停止倒數（只在 prepared）
  useEffect(() => {
    if (!order) return
    const preparedAt = order.preparedAt ? new Date(order.preparedAt).getTime() : null
    const stopped = ["completed", "cancelled", "rejected"].includes(order.status)
    if (!preparedAt || stopped) {
      // 停止
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null }
      setRunning(false)
      setNear(false)
      setProgress(0)
      setLeft(0)
      return
    }
    // 計算剩餘
    const now = Date.now()
    const elapsed = Math.max(0, Math.floor((now - preparedAt) / 1000))
    const remain = Math.max(0, PICKUP_WINDOW_SECS - elapsed)
    setLeft(remain)
    setProgress(Math.min(100, Math.round(((PICKUP_WINDOW_SECS - remain) / PICKUP_WINDOW_SECS) * 100)))
    setNear(remain <= 120)
    setRunning(true)

    // 跑表
    if (tickRef.current) { window.clearInterval(tickRef.current) }
    tickRef.current = window.setInterval(() => {
      setLeft((prev) => {
        const next = Math.max(0, prev - 1)
        setProgress(Math.min(100, Math.round(((PICKUP_WINDOW_SECS - next) / PICKUP_WINDOW_SECS) * 100)))
        setNear(next <= 120)
        if (next === 0) {
          // ✅ 自動取消：調用資料庫 API
          const autoCancel = async () => {
            try {
              console.log("⏰ 倒計時結束，自動取消訂單:", orderId)
              
              const response = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  status: "cancelled",
                  reason: "逾時未取",
                  cancelledBy: "system"
                })
              })
              
              const result = await response.json()
              
              if (response.ok && result.success) {
                console.log("✅ 自動取消成功")
                window.dispatchEvent(new CustomEvent("orderStatusUpdated", {
                  detail: { orderId, status: "cancelled", reason: "逾時未取" }
                }))
                await reload()
              } else {
                console.error("❌ 自動取消失敗:", result)
              }
            } catch (error) {
              console.error("❌ 自動取消錯誤:", error)
            }
          }
          
          autoCancel()
          if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null }
          setRunning(false)
        }
        return next
      })
    }, 1000)
    return () => { if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null } }
  }, [order?.status, order?.preparedAt, orderId])

  const steps = useMemo(() => ([
    { key: "created",   label: "已送出訂單", time: fmt(order?.createdAt) },
    { key: "accepted",  label: "店家已接受", time: fmt(order?.acceptedAt) },
    { key: "prepared",  label: "餐點已準備", time: fmt(order?.preparedAt) },
    { key: "completed", label: "已完成取餐", time: fmt(order?.completedAt) },
    { key: "cancelled", label: "已取消",    time: fmt(order?.cancelledAt) },
    { key: "rejected",  label: "店家已拒絕", time: fmt(order?.rejectedAt) },
  ]), [order])

  if (loading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">載入中…</CardContent></Card>
  }
  if (!order) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">找不到此訂單</CardContent></Card>
  }

  const status = order.status
  const cancelled = status === "cancelled" || status === "rejected"
  const completed = status === "completed"
  const showCountdown = Boolean(order.preparedAt && !cancelled && !completed)

  const mm = Math.floor(left / 60)
  const ss = left % 60
  const timeText = showCountdown ? `${mm}:${String(ss).padStart(2, "0")}` : "—"

  return (
    <div className="space-y-6">
      {/* 摘要＋倒數 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">訂單編號</div>
              <div className="font-semibold">{order.id}</div>
              <div className="text-xs text-muted-foreground mt-1">店家：{order.storeName || order.storeId}</div>
            </div>
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium",
              cancelled ? "bg-red-100 text-red-800" :
              completed ? "bg-green-100 text-green-800" :
              "bg-blue-100 text-blue-800"
            )}>
              {status === "pending" ? "等待確認" :
               status === "accepted" ? "準備中" :
               status === "prepared" ? "已準備" :
               status === "completed" ? "已完成" :
               status === "cancelled" ? "已取消" : "已拒絕"}
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">取餐倒數（10 分鐘）</div>
              <div className={cn("text-2xl font-bold", near && showCountdown ? "text-red-600" : "text-foreground")}>
                {timeText}
              </div>
              {showCountdown && <Progress className="mt-2" value={progress} />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 時間軸 */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 font-medium">訂單進度</div>
          <ol className="relative border-l pl-6">
            {steps.map((s) => {
              const on =
                (s.key === "created") ||
                (s.key === "accepted"  && (status === "accepted" || order.acceptedAt)) ||
                (s.key === "prepared"  && (status === "prepared" || order.preparedAt)) ||
                (s.key === "completed" && (status === "completed" || order.completedAt)) ||
                (s.key === "cancelled" && (status === "cancelled" || order.cancelledAt)) ||
                (s.key === "rejected"  && (status === "rejected" || order.rejectedAt))
              const tint =
                s.key === "cancelled" || s.key === "rejected"
                  ? "bg-red-600"
                  : s.key === "completed"
                    ? "bg-green-600"
                    : "bg-blue-600"
              return (
                <li key={s.key} className="mb-6 ml-4">
                  <div className={cn("absolute -left-1.5 w-3 h-3 rounded-full", on ? tint : "bg-muted-foreground/40")} />
                  <time className="text-xs text-muted-foreground">{s.time || "—"}</time>
                  <div className="font-medium">{s.label}</div>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      {/* 內容＆取餐人資訊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 font-medium">餐點內容</div>
            <div className="space-y-2 text-sm">
              {order.items.map((it) => (
                <div key={`${it.id || it.foodItemId}`} className="flex justify-between">
                  <span>{it.name} ×{it.quantity}</span>
                  <span>NT$ {Number(it.price) * Number(it.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 flex justify-between font-medium">
              <span>總計</span><span>NT$ {Number(order.total)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 font-medium">取餐人資訊</div>
            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground mr-2">姓名</span>{order.customerInfo?.name || "—"}</div>
              <div><span className="text-muted-foreground mr-2">電話</span>{order.customerInfo?.phone || "—"}</div>
              <div><span className="text-muted-foreground mr-2">Email</span>{order.customerInfo?.email || "—"}</div>
              {order.note && <div className="text-muted-foreground mt-3">備註</div>}
              {order.note && <div className="text-sm">{order.note}</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 你若在用戶端提供「取消訂單」按鈕，可放這裡；取消會即刻停表 */}
      {/* <div className="flex justify-end">
        <Button variant="outline" onClick={handleUserCancel}>取消訂單</Button>
      </div> */}
    </div>
  )
}
