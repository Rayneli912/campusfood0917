"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { initDataSyncListeners, STORE_DATA_UPDATED, USER_DATA_UPDATED, ORDER_DATA_UPDATED } from "@/lib/sync-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { generateNewStoreCode } from "@/lib/order-utils"
import { toast } from "@/components/ui/use-toast"
import CountersPanel from "@/components/admin/counters-panel-new"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalStores: 0,
    activeStores: 0,
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    pendingStores: 0,
  })

  const [pendingStores, setPendingStores] = useState<any[]>([])
  const [selectedStore, setSelectedStore] = useState<any | null>(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

  // ✅ 從 API 載入統計數據
  const loadStats = async () => {
    try {
      // 並行獲取所有數據
      const [usersRes, storesRes, ordersRes, pendingRes] = await Promise.all([
        fetch("/api/admin/users").then(r => r.json()),
        fetch("/api/admin/stores").then(r => r.json()),
        fetch("/api/orders").then(r => r.json()),
        fetch("/api/admin/stores/pending").then(r => r.json()),
      ])

      const users = usersRes.users || []
      const stores = storesRes.stores || []
      const orders = ordersRes.orders || []
      const pending = pendingRes.stores || []

      const activeUsers = users.filter((user: any) => !user.is_disabled).length
      const activeStores = stores.filter((store: any) => store.status === "active").length
      const activeOrders = orders.filter((order: any) =>
        ["pending", "accepted", "prepared"].includes(order.status)
      ).length
      const completedOrders = orders.filter((order: any) => order.status === "completed").length
      const cancelledOrders = orders.filter((order: any) =>
        ["cancelled", "rejected"].includes(order.status)
      ).length

      setStats({
        totalUsers: users.length,
        activeUsers,
        totalStores: stores.length,
        activeStores,
        totalOrders: orders.length,
        activeOrders,
        completedOrders,
        cancelledOrders,
        pendingStores: pending.length,
      })

      setPendingStores(pending)
    } catch (error) {
      console.error("載入統計數據時發生錯誤:", error)
    }
  }

  // 處理店家審核
  const handleApproveStore = async (store: any) => {
    try {
      const storeCode = generateNewStoreCode()

      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      const newStore = {
        id: `store-${store.username}`,
        storeCode,
        username: store.username,
        password: store.password,
        name: store.name,
        location: store.location,
        description: store.description || `${store.name}的美食`,
        businessHours: "週一至週五 09:00-18:00",
        phone: store.phone,
        email: store.email,
        isDisabled: false,
        createdAt: new Date().toISOString(),
        status: "active",
      }
      registeredStores.push(newStore)
      localStorage.setItem("registeredStores", JSON.stringify(registeredStores))

      const pendingStores = JSON.parse(localStorage.getItem("pendingStores") || "[]")
      const updatedPendingStores = pendingStores.filter((s: any) => s.username !== store.username)
      localStorage.setItem("pendingStores", JSON.stringify(updatedPendingStores))

      const stores = JSON.parse(localStorage.getItem("stores") || "[]")
      stores.push({
        id: newStore.id,
        name: newStore.name,
        description: newStore.description,
        category: "其他",
        rating: 5.0,
        location: newStore.location,
        contact: newStore.phone,
        openTime: "09:00",
        closeTime: "18:00",
        isNew: true,
        status: "active",
        coverImage: `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(newStore.name)}`,
      })
      localStorage.setItem("stores", JSON.stringify(stores))

      localStorage.setItem(`store_${newStore.id}_products`, JSON.stringify([]))
      localStorage.setItem(`store_${newStore.id}_orders`, JSON.stringify([]))
      localStorage.setItem(`store_${newStore.id}_settings`, JSON.stringify({
        notifications: { newOrder: true, orderStatus: true, systemUpdates: true },
        display: { showOutOfStock: false, showSoldCount: true },
      }))

      window.dispatchEvent(new CustomEvent("storeRegistered", { detail: { store: newStore } }))
      window.dispatchEvent(new CustomEvent("storeUpdated"))

      loadStats()

      toast({
        title: "店家審核通過",
        description: `已成功核准 ${store.name} 的註冊申請`,
      })

      setIsApproveDialogOpen(false)
      setSelectedStore(null)
    } catch (error) {
      console.error("核准店家註冊時發生錯誤:", error)
      toast({ title: "錯誤", description: "核准店家註冊時發生錯誤", variant: "destructive" })
    }
  }

  const handleRejectStore = (store: any) => {
    try {
      const pendingStores = JSON.parse(localStorage.getItem("pendingStores") || "[]")
      const updatedPendingStores = pendingStores.filter((s: any) => s.username !== store.username)
      localStorage.setItem("pendingStores", JSON.stringify(updatedPendingStores))
      loadStats()
      toast({ title: "已拒絕店家註冊", description: `已拒絕 ${store.name} 的註冊申請` })
      setIsRejectDialogOpen(false)
      setSelectedStore(null)
    } catch (error) {
      console.error("拒絕店家註冊時發生錯誤:", error)
      toast({ title: "錯誤", description: "拒絕店家註冊時發生錯誤", variant: "destructive" })
    }
  }

  // 監聽數據更新
  useEffect(() => {
    loadStats()

    initDataSyncListeners((eventName) => {
      switch (eventName) {
        case USER_DATA_UPDATED:
        case STORE_DATA_UPDATED:
        case ORDER_DATA_UPDATED:
          loadStats()
          break
      }
    })

    const refreshInterval = setInterval(loadStats, 5000)
    return () => {
      clearInterval(refreshInterval)
    }
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">管理員儀表板</h1>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* 用戶統計 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">用戶總數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">活躍用戶: {stats.activeUsers}</p>
          </CardContent>
        </Card>

        {/* 店家統計 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">店家總數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStores}</div>
            <p className="text-xs text-muted-foreground">活躍店家: {stats.activeStores}</p>
          </CardContent>
        </Card>

        {/* 進行中訂單 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進行中訂單</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
            <p className="text-xs text-muted-foreground">總訂單數: {stats.totalOrders}</p>
          </CardContent>
        </Card>

        {/* 訂單完成率 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">訂單完成率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              已完成: {stats.completedOrders} | 已取消: {stats.cancelledOrders}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ 計數器管理（與首頁同步） */}
      <CountersPanel />

      {/* 店家註冊審核區塊 */}
      {stats.pendingStores > 0 && (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">待審核店家</h2>
              <Badge variant="secondary">{stats.pendingStores} 個待審核</Badge>
            </div>

            <div className="grid gap-4">
              {pendingStores.map((store) => (
                <Card key={store.username}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{store.name}</CardTitle>
                      <Badge>待審核</Badge>
                    </div>
                    <CardDescription>店家帳號: {store.username}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-muted-foreground">聯絡電話：</span><span>{store.phone}</span></div>
                        <div><span className="text-muted-foreground">電子郵件：</span><span>{store.email}</span></div>
                        <div><span className="text-muted-foreground">店家地址：</span><span>{store.location}</span></div>
                        <div><span className="text-muted-foreground">申請時間：</span><span>{new Date(store.appliedAt).toLocaleString()}</span></div>
                      </div>
                      {store.description && (
                        <div className="mt-2">
                          <span className="text-muted-foreground">店家簡介：</span>
                          <p className="mt-1">{store.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardContent className="flex justify-end space-x-2 pt-0">
                    <Button variant="outline" onClick={() => { setSelectedStore(store); setIsRejectDialogOpen(true) }}>
                      拒絕
                    </Button>
                    <Button onClick={() => { setSelectedStore(store); setIsApproveDialogOpen(true) }}>
                      核准
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
      )}

      {/* 核准確認對話框 */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認核准店家註冊</AlertDialogTitle>
            <AlertDialogDescription>確定要核准 {selectedStore?.name} 的店家註冊申請嗎？核准後將自動分配店家代號。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleApproveStore(selectedStore)}>確認核准</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 拒絕確認對話框 */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認拒絕店家註冊</AlertDialogTitle>
            <AlertDialogDescription>確定要拒絕 {selectedStore?.name} 的註冊申請嗎？此操作無法撤銷。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRejectStore(selectedStore)}>確認拒絕</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
