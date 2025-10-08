"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useStoreAuth } from "@/components/store-auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { orders } from "@/lib/data"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, CheckCircle, XCircle, Package, MessageSquare, Calendar, Clock, ShoppingBag } from "lucide-react"
import { syncOrderStatus } from "@/lib/sync-service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { account } = useStoreAuth()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // 模擬資料載入
    const timer = setTimeout(() => {
      try {
        const orderId = params.id as string
        const foundOrder = orders.find((o) => o.id === orderId)
        if (foundOrder) setOrder(foundOrder)
      } catch (error) {
        console.error("Error loading order:", error)
        toast({ title: "載入失敗", description: "無法載入訂單資料，請稍後再試", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }, 500)

    // 監聽訂單狀態變化（沿用你現有的事件名）
    const handleOrderStatusUpdate = (e: any) => {
      if (e.detail && e.detail.orderId === params.id) {
        setOrder((prev) => {
          if (!prev) return null
          const data = e.detail.data || e.detail.order || {}
          return {
            ...prev,
            ...data,
            status: data.status ?? prev.status,
            cancelledBy: data.cancelledBy ?? prev.cancelledBy,
            cancelReason: data.reason ?? data.cancelReason ?? prev.cancelReason,
          }
        })
      }
    }
    window.addEventListener("orderStatusUpdated", handleOrderStatusUpdate)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("orderStatusUpdated", handleOrderStatusUpdate)
    }
  }, [params.id, toast])

  // ==== 逾時計時自動取消（新增；不改 UI）====
  useEffect(() => {
    if (!order) return
    if (["completed", "cancelled", "rejected"].includes(order.status)) return

    const checkExpiredAndAutoCancel = () => {
      try {
        const key = `orderTimer_${order.id}`
        const t = localStorage.getItem(key)
        let expired = false
        if (t) {
          const obj = JSON.parse(t) || {}
          const start = obj.preparedAt ? new Date(obj.preparedAt).getTime() : 0
          const limit = Number(obj.initialTime ?? obj.left ?? 600) // 預設 10 分
          expired = start > 0 ? (Date.now() - start) / 1000 >= limit : false
        } else if (order.preparedAt) {
          expired = Date.now() - new Date(order.preparedAt).getTime() >= 10 * 60 * 1000
        }
        if (expired) {
          const ok = syncOrderStatus(order.id as string, "cancelled", "system", "逾期未取")
          if (ok) {
            setOrder((prev:any) => prev ? { ...prev, status:"cancelled", cancelledBy:"system", cancelReason:"逾期未取", cancelledAt: new Date().toISOString() } : prev)
            toast({ title: "訂單已取消", description: "逾期未取，系統已自動取消。" })
          }
        }
      } catch {}
    }

    // 立即檢查一次＋每 10 秒檢查一次（輕量）
    checkExpiredAndAutoCancel()
    const id = setInterval(checkExpiredAndAutoCancel, 10_000)
    return () => clearInterval(id)
  }, [order, toast])

  // Format date time
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "尚未記錄"
    try {
      const date = new Date(dateString)
      return date.toLocaleString("zh-TW", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit" })
    } catch { return "日期格式錯誤" }
  }

  const handleAcceptOrder = () => {
    setIsProcessing(true)
    const success = syncOrderStatus(params.id as string, "accepted")
    if (success) {
      const now = new Date().toISOString()
      setOrder((prev: any) => ({ ...prev, status: "accepted", acceptedAt: now, updatedAt: now }))
      toast({ title: "訂單已接受", description: `訂單 #${order.id} 已成功接受` })
    } else {
      toast({ title: "操作失敗", description: "無法接受訂單，請稍後再試", variant: "destructive" })
    }
    setIsProcessing(false)
  }

  const handlePreparedOrder = () => {
    setIsProcessing(true)
    const success = syncOrderStatus(params.id as string, "prepared")
    if (success) {
      const now = new Date().toISOString()
      setOrder((prev: any) => ({ ...prev, status: "prepared", preparedAt: now, updatedAt: now }))
      toast({ title: "餐點已準備完成", description: `訂單 #${order.id} 的餐點已準備完成，等待顧客取餐` })
    } else {
      toast({ title: "操作失敗", description: "無法更新訂單狀態，請稍後再試", variant: "destructive" })
    }
    setIsProcessing(false)
  }

  const handleCompleteOrder = () => {
    // 檢查訂單狀態是否允許完成
    if (["cancelled", "rejected", "completed"].includes(order.status)) {
      let message = "此訂單不可完成。"
      if (order.status === "cancelled") {
        message = "此訂單已取消，無法完成。"
      } else if (order.status === "rejected") {
        message = "此訂單已被拒絕，無法完成。"
      } else if (order.status === "completed") {
        message = "此訂單已完成。"
      }
      toast({ title: "無法完成", description: message, variant: "destructive" })
      return
    }

    // 檢查是否逾時
    const t = localStorage.getItem(`orderTimer_${order.id}`)
    let isExpired = false
    if (t) {
      try {
        const obj = JSON.parse(t)
        const start = obj.preparedAt ? new Date(obj.preparedAt).getTime() : 0
        const limit = Number(obj.initialTime ?? obj.left ?? 600)
        isExpired = start > 0 ? (Date.now() - start) / 1000 >= limit : false
      } catch {}
    } else if (order?.preparedAt) {
      isExpired = Date.now() - new Date(order.preparedAt).getTime() >= 10 * 60 * 1000
    }
    
    if (isExpired) {
      toast({ title: "訂單已逾時", description: "此訂單已逾時，系統將自動取消。", variant: "destructive" })
      // 自動取消逾時訂單
      syncOrderStatus(order.id as string, "cancelled", "system", "逾期未取")
      setOrder((prev:any) => prev ? { 
        ...prev, 
        status: "cancelled", 
        cancelledBy: "system", 
        cancelReason: "逾期未取", 
        cancelledAt: new Date().toISOString() 
      } : prev)
      return
    }

    setIsProcessing(true)
    const success = syncOrderStatus(params.id as string, "completed", "store")
    if (success) {
      const now = new Date().toISOString()
      setOrder((prev: any) => ({ ...prev, status: "completed", completedAt: now, updatedAt: now }))
      toast({ title: "訂單已完成", description: `訂單 #${order.id} 已標記為完成` })
    } else {
      toast({ title: "操作失敗", description: "無法完成訂單，請稍後再試", variant: "destructive" })
    }
    setIsProcessing(false)
  }

  const handleRejectOrder = () => setIsRejectDialogOpen(true)

  const confirmRejectOrder = () => {
    setIsProcessing(true)
    const success = syncOrderStatus(params.id as string, "rejected", "store", rejectReason)
    if (success) {
      const now = new Date().toISOString()
      setOrder((prev: any) => ({ ...prev, status: "rejected", cancelReason: rejectReason, cancelledAt: now, updatedAt: now }))
      toast({ title: "訂單已拒絕", description: `訂單 #${order.id} 已被拒絕`, variant: "destructive" })
    } else {
      toast({ title: "操作失敗", description: "無法拒絕訂單，請稍後再試", variant: "destructive" })
    }
    setIsRejectDialogOpen(false)
    setIsProcessing(false)
  }

  const handleCancelOrder = () => setIsCancelDialogOpen(true)

  const confirmCancelOrder = () => {
    setIsProcessing(true)
    const success = syncOrderStatus(params.id as string, "cancelled", "store", cancelReason)
    if (success) {
      const now = new Date().toISOString()
      setOrder((prev: any) => ({ ...prev, status: "cancelled", cancelledBy:"store", cancelReason, cancelledAt: now, updatedAt: now }))
      toast({ title: "訂單已取消", description: `訂單 #${order.id} 已被取消`, variant: "destructive" })
    } else {
      toast({ title: "操作失敗", description: "無法取消訂單，請稍後再試", variant: "destructive" })
    }
    setIsCancelDialogOpen(false)
    setIsProcessing(false)
  }

  const getStatusBadge = (status: string, cancelledBy?: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">等待確認</Badge>
      case "accepted":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">準備中</Badge>
      case "prepared":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">已準備</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">已完成</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">已拒絕</Badge>
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{cancelledBy === "user" ? "用戶取消" : "店家/系統取消"}</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Skeleton className="h-9 w-24 mr-4" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
          <CardFooter><Skeleton className="h-9 w-full" /></CardFooter>
        </Card>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-4">請先登入</h2>
        <p className="text-muted-foreground mb-6">您需要登入才能查看訂單詳情</p>
        <Button asChild><a href="/store/login">前往登入</a></Button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">找不到訂單</h2>
          <p className="text-muted-foreground mb-6">找不到指定的訂單資訊</p>
          <Button onClick={() => router.push("/store/dashboard")}>查看所有訂單</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="outline" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-1" />返回
        </Button>
        <h1 className="text-2xl font-bold">訂單 #{order.id} 詳情</h1>
      </div>

      {/* 訂單時間軸（原樣保留） */}
      <Card>
        <CardHeader><CardTitle>訂單時間軸</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">訂單創建</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
              </div>
            </div>

            <div className={`flex items-start ${order.acceptedAt ? "" : "opacity-50"}`}>
              <div className={`mr-4 flex h-10 w-10 items-center justify-center rounded-full ${order.acceptedAt ? "bg-blue-100" : "bg-muted"}`}>
                <Clock className={`h-5 w-5 ${order.acceptedAt ? "text-blue-600" : "text-muted-foreground"}`} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">店家接單</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(order.acceptedAt)}</p>
              </div>
            </div>

            <div className={`flex items-start ${order.preparedAt ? "" : "opacity-50"}`}>
              <div className={`mr-4 flex h-10 w-10 items-center justify-center rounded-full ${order.preparedAt ? "bg-green-100" : "bg-muted"}`}>
                <ShoppingBag className={`h-5 w-5 ${order.preparedAt ? "text-green-600" : "text-muted-foreground"}`} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">餐點準備完成</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(order.preparedAt)}</p>
              </div>
            </div>

            <div className={`flex items-start ${order.completedAt ? "" : "opacity-50"}`}>
              <div className={`mr-4 flex h-10 w-10 items-center justify-center rounded-full ${order.completedAt ? "bg-green-100" : "bg-muted"}`}>
                <CheckCircle className={`h-5 w-5 ${order.completedAt ? "text-green-600" : "text-muted-foreground"}`} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">訂單完成</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(order.completedAt)}</p>
              </div>
            </div>

            {(order.status === "cancelled" || order.status === "rejected") && (
              <div className="flex items-start">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {order.status === "cancelled" ? "訂單取消" : "訂單被拒絕"}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(order.cancelledAt)}</p>
                  {order.cancelReason && <p className="text-sm text-red-500 mt-1">原因: {order.cancelReason}</p>}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>訂單資訊</CardTitle>
            {getStatusBadge(order.status, order.cancelledBy)}
          </div>
          <p className="text-sm text-muted-foreground">下單時間: {formatDateTime(order.createdAt)}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">訂單項目</h3>
            <div className="space-y-2">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between py-1">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground"> x{item.quantity}</span>
                  </div>
                  <span>${item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">訂單摘要</h3>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">小計</span><span>${order.total}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">折扣</span><span>$0</span></div>
              <div className="flex justify-between font-medium"><span>總計</span><span>${order.total}</span></div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">取餐資訊</h3>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">取餐地點</span><span>{order.storeLocation || "校園中心區域"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">客戶ID</span><span>{order.userId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">備註</span><span>{order.note || "無"}</span></div>{/* ← 修正：顯示用戶備註 */}
            </div>
          </div>

          {(order.status === "cancelled" || order.status === "rejected") && order.cancelReason && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2 text-red-600">
                  {order.status === "cancelled" ? "取消原因" : "拒絕原因"}
                </h3>
                <div className="p-3 bg-red-50 rounded-md text-red-700">{order.cancelReason}</div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          {order.status === "pending" && (
            <div className="flex w-full space-x-2">
              <Button variant="destructive" className="flex-1" onClick={handleRejectOrder} disabled={isProcessing}>
                <XCircle className="h-4 w-4 mr-1" />拒絕訂單
              </Button>
              <Button className="flex-1" onClick={handleAcceptOrder} disabled={isProcessing}>
                <CheckCircle className="h-4 w-4 mr-1" />接受訂單
              </Button>
            </div>
          )}

          {order.status === "accepted" && (
            <div className="flex w-full space-x-2">
              <Button variant="outline" className="flex-1" onClick={handleCancelOrder} disabled={isProcessing}>
                <XCircle className="h-4 w-4 mr-1" />取消訂單
              </Button>
              <Button className="flex-1" onClick={handlePreparedOrder} disabled={isProcessing}>
                <Package className="h-4 w-4 mr-1" />備餐完畢
              </Button>
            </div>
          )}

          {order.status === "prepared" && (
            <div className="flex w-full space-x-2">
              <Button variant="outline" className="flex-1" onClick={handleCancelOrder} disabled={isProcessing}>
                <XCircle className="h-4 w-4 mr-1" />取消訂單
              </Button>
              <Button className="flex-1" onClick={handleCompleteOrder} disabled={isProcessing || order.status !== "prepared"}>
                <CheckCircle className="h-4 w-4 mr-1" />完成訂單
              </Button>
            </div>
          )}

          {(order.status === "completed" || order.status === "rejected" || order.status === "cancelled") && (
            <div className="w-full">
              <Button variant="outline" className="w-full" onClick={() => toast({ title: "已發送通知", description: "已通知客戶訂單狀態" })}>
                <MessageSquare className="h-4 w-4 mr-1" />聯絡客戶
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* 拒絕訂單對話框 */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>拒絕訂單</AlertDialogTitle>
            <AlertDialogDescription>請輸入拒絕訂單的原因，此訊息將會顯示給顧客。</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="請輸入拒絕原因..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[100px]" />
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRejectOrder} disabled={isProcessing}>確認拒絕</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 取消訂單對話框 */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取消訂單</AlertDialogTitle>
            <AlertDialogDescription>請輸入取消訂單的原因，此訊息將會顯示給顧客。</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="請輸入取消原因..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="min-h-[100px]" />
          <AlertDialogFooter>
            <AlertDialogCancel>返回</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelOrder} disabled={isProcessing}>確認取消</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
