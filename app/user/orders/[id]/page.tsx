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
import { Loader2 } from "lucide-react"

type OrderItem = { id: string; name: string; price: number; quantity: number }
type Order = {
  id: string
  items: OrderItem[]
  total: number
  status: "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected"
  createdAt: string
  cancelledAt?: string
  cancelReason?: string
  reason?: string
  cancelledBy?: string
  note?: string
  storeName?: string
}

export default function UserOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  // ✅ 從 API 載入訂單數據
  const loadOrder = async () => {
    const id = String(params.id)
    try {
      console.log("📥 載入訂單詳情:", id)
      const response = await fetch(`/api/orders/${id}`, {
        cache: "no-store"
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.order) {
          const o = result.order
          setOrder({
            id: o.id,
            items: (o.order_items || o.items || []).map((item: any) => ({
              id: item.product_id || item.id,
              name: item.product_name || item.name,
              price: Number(item.price),
              quantity: Number(item.quantity),
            })),
            total: Number(o.total || 0),
            status: o.status,
            createdAt: o.created_at || o.createdAt,
            cancelledAt: o.cancelled_at || o.cancelledAt,
            cancelReason: o.cancel_reason || o.cancelReason || o.reason,
            reason: o.reason,
            cancelledBy: o.cancelled_by || o.cancelledBy,
            note: o.note,
            storeName: o.store_name || o.storeName,
          })
          console.log("✅ 訂單詳情載入成功")
        }
      }
    } catch (error) {
      console.error("❌ 載入訂單詳情錯誤:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
    
    // 監聽訂單更新事件
    const handleUpdate = (ev: any) => {
      if (ev?.detail?.orderId === params.id) {
        loadOrder()
      }
    }
    
    window.addEventListener("orderStatusUpdated", handleUpdate as EventListener)
    return () => {
      window.removeEventListener("orderStatusUpdated", handleUpdate as EventListener)
    }
  }, [params.id])

  const statusText: Record<Order["status"], string> = {
    pending: "已送出，等待店家確認",
    accepted: "店家準備中",
    prepared: "餐點已準備完成",
    completed: "已完成取餐",
    cancelled: "已取消",
    rejected: "已被店家拒絕",
  }

  // ✅ 取消訂單處理
  const handleCancel = async () => {
    if (!order) return
    
    const r = reason.trim() || "使用者取消"
    const ok = await syncOrderStatus(order.id, "cancelled", "user", r, "user")
    
    if (ok) {
      toast({ title: "已取消訂單", description: r })
      // 重新載入訂單數據
      await loadOrder()
    } else {
      toast({ title: "取消失敗", description: "請稍後再試", variant: "destructive" })
    }
    setOpen(false)
    setReason("")
  }

  // ✅ 判斷是否可以取消（只有在 "prepared" 之前才能取消）
  const canCancel = order && 
    order.status !== "prepared" && 
    order.status !== "completed" && 
    order.status !== "cancelled" && 
    order.status !== "rejected"

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container py-6">
        <Button variant="ghost" onClick={() => router.back()}>返回</Button>
        <Card><CardContent className="py-10 text-center text-muted-foreground">找不到此訂單</CardContent></Card>
      </div>
    )
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

          {/* ✅ 顯示取消或拒絕原因 */}
          {(order.status === "cancelled" || order.status === "rejected") && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <div className="font-medium mb-1">
                {order.status === "cancelled" ? "訂單已取消" : "訂單已被店家拒絕"}
              </div>
              {(order.reason || order.cancelReason) && (
                <div>原因：{order.reason || order.cancelReason}</div>
              )}
              {order.cancelledBy && (
                <div className="text-xs mt-1 text-red-600">
                  由 {order.cancelledBy === "user" ? "使用者" : order.cancelledBy === "store" ? "店家" : "系統"} 取消
                </div>
              )}
              {order.cancelledAt && (
                <div className="text-xs mt-1">
                  時間：{new Date(order.cancelledAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive" 
            disabled={!canCancel} 
            onClick={() => setOpen(true)}
          >
            {order.status === "prepared" ? "餐點已準備，無法取消" : "取消訂單"}
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
