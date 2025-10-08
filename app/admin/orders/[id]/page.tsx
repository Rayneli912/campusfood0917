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
import { Loader2, ArrowLeft } from "lucide-react"
import ActiveOrderTracking from "@/components/active-order-tracking"

type OrderItem = { id: string; name: string; price: number; quantity: number }
type Order = {
  id: string
  items: OrderItem[]
  total: number
  status: "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected"
  createdAt: string
  preparedAt?: string
  cancelledAt?: string
  cancelReason?: string
  reason?: string
  cancelledBy?: string
  note?: string
  storeName?: string
  userName?: string
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [actionType, setActionType] = useState<"cancel" | "reject" | "accept" | "prepare" | "complete">("cancel")
  
  // 檢查是否從店家管理進入（通過 URL 參數）
  const [showActions, setShowActions] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      setShowActions(searchParams.get('from') === 'store')
    }
  }, [])

  // 載入訂單數據
  const loadOrder = async () => {
    const id = String(params.id)
    try {
      console.log("📥 管理員載入訂單詳情:", id)
      const response = await fetch(`/api/orders/${id}`, {
        cache: "no-store"
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.order) {
          const o = result.order
          setOrder({
            id: o.id,
            items: (o.order_items || []).map((item: any) => ({
              id: item.product_id || item.id,
              name: item.product_name || item.name,
              price: Number(item.price),
              quantity: Number(item.quantity),
            })),
            total: Number(o.total || 0),
            status: o.status,
            createdAt: o.created_at || o.createdAt,
            preparedAt: o.prepared_at || o.preparedAt,
            cancelledAt: o.cancelled_at || o.cancelledAt,
            cancelReason: o.cancel_reason || o.cancelReason,
            reason: o.reason,
            cancelledBy: o.cancelled_by || o.cancelledBy,
            note: o.note,
            storeName: o.store_name || o.storeName || (o.stores?.name),
            userName: o.user_name || o.userName || (o.users?.name),
          })
        }
      }
    } catch (error) {
      console.error("❌ 載入訂單失敗:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()

    const handleUpdate = () => {
      console.log("🔄 訂單更新事件，重新載入")
      loadOrder()
    }
    window.addEventListener("orderStatusUpdated", handleUpdate)
    return () => window.removeEventListener("orderStatusUpdated", handleUpdate)
  }, [params.id])

  const handleAction = async (action: "accept" | "reject" | "prepare" | "complete" | "cancel", actionReason?: string) => {
    if (!order) return

    const statusMap = {
      accept: "accepted",
      reject: "rejected",
      prepare: "prepared",
      complete: "completed",
      cancel: "cancelled",
    }

    const ok = await syncOrderStatus(
      order.id,
      statusMap[action],
      "admin",
      actionReason,
      action === "cancel" || action === "reject" ? "admin" : undefined
    )

    if (ok) {
      toast({ title: "操作成功", description: `訂單已${action === "accept" ? "接受" : action === "reject" ? "拒絕" : action === "prepare" ? "準備" : action === "complete" ? "完成" : "取消"}` })
      await loadOrder()
    } else {
      toast({ title: "操作失敗", description: "無法更新訂單狀態", variant: "destructive" })
    }
    setOpen(false)
    setReason("")
  }

  const openDialog = (type: "cancel" | "reject" | "accept" | "prepare" | "complete") => {
    setActionType(type)
    if (type === "cancel" || type === "reject") {
      setOpen(true)
    } else {
      handleAction(type)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container py-8">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <div className="text-center py-8">找不到訂單</div>
      </div>
    )
  }

  const canAccept = order.status === "pending"
  const canReject = order.status === "pending"
  const canPrepare = order.status === "accepted"
  const canComplete = order.status === "prepared"
  const canCancel = order.status !== "completed" && order.status !== "cancelled" && order.status !== "rejected"

  return (
    <div className="container py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>訂單詳情</CardTitle>
            <Badge
              variant={
                order.status === "completed"
                  ? "default"
                  : order.status === "cancelled" || order.status === "rejected"
                  ? "destructive"
                  : "secondary"
              }
            >
              {order.status === "pending"
                ? "待接單"
                : order.status === "accepted"
                ? "已接單"
                : order.status === "prepared"
                ? "已準備"
                : order.status === "completed"
                ? "已完成"
                : order.status === "cancelled"
                ? "已取消"
                : "已拒絕"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 訂單編號 */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">訂單編號</div>
            <div className="font-mono">{order.id}</div>
          </div>

          <Separator />

          {/* 用戶和店家資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">用戶</div>
              <div>{order.userName || "未知用戶"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">店家</div>
              <div>{order.storeName || "未知店家"}</div>
            </div>
          </div>

          <Separator />

          {/* 倒計時（僅當訂單為已準備狀態時顯示） */}
          {order.status === "prepared" && (
            <>
              <ActiveOrderTracking orderId={order.id} />
              <Separator />
            </>
          )}

          {/* 訂單項目 */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">訂單內容</div>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${item.price} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-medium">${item.price * item.quantity}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 備註 */}
          {order.note && (
            <>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-1">備註</div>
                <div className="p-3 bg-muted rounded-lg">{order.note}</div>
              </div>
            </>
          )}

          {/* 取消原因 */}
          {(order.status === "cancelled" || order.status === "rejected") && (
            <>
              <Separator />
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="font-medium mb-1">
                  {order.status === "cancelled" ? "訂單已取消" : "訂單已被店家拒絕"}
                </div>
                {(order.reason || order.cancelReason) && (
                  <div>原因：{order.reason || order.cancelReason}</div>
                )}
                {order.cancelledBy && (
                  <div className="text-xs mt-1 text-red-600">
                    由 {order.cancelledBy === "user" ? "使用者" : order.cancelledBy === "store" ? "店家" : order.cancelledBy === "admin" ? "管理員" : "系統"} 取消
                  </div>
                )}
                {order.cancelledAt && (
                  <div className="text-xs mt-1">
                    時間：{new Date(order.cancelledAt).toLocaleString()}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* 總計 */}
          <div className="flex items-center justify-between text-lg font-bold">
            <span>總計</span>
            <span>${order.total}</span>
          </div>
        </CardContent>

        {/* 管理員操作按鈕（僅在從店家管理進入時顯示） */}
        {showActions && (
          <CardFooter className="flex gap-2 flex-wrap">
            {canAccept && (
              <Button onClick={() => openDialog("accept")} className="bg-green-600 hover:bg-green-700">
                接受訂單
              </Button>
            )}
            {canReject && (
              <Button onClick={() => openDialog("reject")} variant="destructive">
                拒絕訂單
              </Button>
            )}
            {canPrepare && (
              <Button onClick={() => openDialog("prepare")} className="bg-blue-600 hover:bg-blue-700">
                標記為已準備
              </Button>
            )}
            {canComplete && (
              <Button onClick={() => openDialog("complete")} className="bg-purple-600 hover:bg-purple-700">
                標記為已完成
              </Button>
            )}
            {canCancel && (
              <Button onClick={() => openDialog("cancel")} variant="outline">
                取消訂單
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* 取消/拒絕對話框 */}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "cancel" ? "取消訂單" : "拒絕訂單"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              原因（可選填）
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`請輸入${actionType === "cancel" ? "取消" : "拒絕"}原因...`}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setOpen(false); setReason("") }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction(actionType, reason.trim() || (actionType === "cancel" ? "管理員取消" : "管理員拒絕"))}
              className={actionType === "reject" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              確認
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
