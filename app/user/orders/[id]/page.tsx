"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { syncOrderStatus } from "@/lib/sync-service"

type OrderItem = { id: string; name: string; price: number; quantity: number }
type Order = {
  id: string
  items: OrderItem[]
  total: number
  status: "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected"
  createdAt: string
  cancelledAt?: string
  cancelReason?: string
  note?: string
}

export default function UserOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  useEffect(() => {
    const id = String(params.id)
    try {
      const list: Order[] = JSON.parse(localStorage.getItem("orders") || "[]")
      setOrder(list.find(o => String(o.id) === id) || null)
    } catch {}
    const h = (ev:any) => { if (ev?.detail?.orderId === id) setOrder((p:any)=>p?{...p,...(ev.detail.order||ev.detail.data)}:p) }
    window.addEventListener("orderStatusUpdated", h as EventListener)
    window.addEventListener("order-data-updated", h as EventListener)
    return () => {
      window.removeEventListener("orderStatusUpdated", h as EventListener)
      window.removeEventListener("order-data-updated", h as EventListener)
    }
  }, [params.id])

  if (!order) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => router.back()}>返回</Button>
        <Card><CardContent className="py-10 text-center text-muted-foreground">找不到此訂單</CardContent></Card>
      </div>
    )
  }

  const statusText: Record<Order["status"], string> = {
    pending: "已送出，等待店家確認",
    accepted: "店家準備中",
    prepared: "餐點已準備完成",
    completed: "已完成取餐",
    cancelled: "已取消",
    rejected: "已被店家拒絕",
  }

  const handleCancel = async () => {
    const r = reason.trim() || "使用者取消"
    const ok = await syncOrderStatus(order.id, "cancelled", "user", r)
    if (ok) {
      setOrder(prev => prev ? { ...prev, status:"cancelled", cancelledAt:new Date().toISOString(), cancelReason:r } : prev)
      toast({ title: "已取消訂單", description: r })
    } else {
      toast({ title: "取消失敗", description: "請稍後再試", variant: "destructive" })
    }
    setOpen(false); setReason("")
  }

  return (
    <div className="container py-6 space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>返回</Button>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>訂單 #{order.id}</CardTitle>
          <Badge variant="outline">{statusText[order.status]}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="font-medium">餐點內容</div>
            <div className="space-y-2">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between">
                  <div>{it.name} × {it.quantity}</div>
                  <div>${Number(it.price) * Number(it.quantity)}</div>
                </div>
              ))}
            </div>
            {order.note && (
              <div className="mt-3 rounded-md border bg-muted/40 p-3">
                <div className="text-sm text-muted-foreground mb-1">我的備註</div>
                <div className="text-sm whitespace-pre-wrap">{order.note}</div>
              </div>
            )}
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            建立時間：{new Date(order.createdAt).toLocaleString()}
          </div>

          {order.status === "cancelled" && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              已取消{order.cancelReason ? `（${order.cancelReason}）` : ""}{order.cancelledAt ? `，時間：${new Date(order.cancelledAt).toLocaleString()}` : ""}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="destructive" disabled={order.status === "completed" || order.status === "cancelled"} onClick={() => setOpen(true)}>
            取消訂單
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認要取消此訂單？</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">請輸入取消原因（選填）</div>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="我改變主意了 / 下錯單 / 其他……" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>返回</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>確認取消</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
