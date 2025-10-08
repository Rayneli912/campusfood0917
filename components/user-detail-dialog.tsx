"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import {
  updateUserData,
  updateUserFavorites,
  updateUserRecentViews,
  updateUserCart,
  FAVORITES_UPDATED,
  RECENT_VIEWS_UPDATED,
  CART_UPDATED,
  USER_DATA_UPDATED,
  ORDER_DATA_UPDATED,
  syncOrderStatus,
} from "@/lib/sync-service"
import type { UserFullData, Order, OrderStatus } from "@/types"

/* ----------------------------- Helpers ----------------------------- */

// 產生穩定 key：優先用資料的唯一欄位，最後退回索引
function makeKey(prefix: string, v: any, i: number) {
  const base =
    v?.id ??
    v?.storeId ??
    v?.orderId ??
    v?.productId ??
    v?.name ??
    v?.email ??
    v?.phone ??
    i
  return `${prefix}-${String(base)}-${i}`
}

function safeJSON<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function formatDateTimeTW(dateTimeStr?: string) {
  if (!dateTimeStr) return ""
  try {
    const d = new Date(dateTimeStr)
    return d.toLocaleString("zh-TW")
  } catch {
    return dateTimeStr || ""
  }
}

/* --------------------------- Component ---------------------------- */

interface UserDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onUpdate?: () => void
}

export function UserDetailDialog({ isOpen, onClose, userId, onUpdate }: UserDetailDialogProps) {
  const [userData, setUserData] = useState<UserFullData | null>(null)
  const [loading, setLoading] = useState(true)
  const [storeMap, setStoreMap] = useState<Record<string, string>>({})

  // 讀取店家快取（用於用 storeId 找名字）
  const loadStoresMap = useCallback(() => {
    const stores = safeJSON<any[]>(localStorage.getItem("registeredStores"), [])
    const map: Record<string, string> = {}
    for (const s of stores) {
      if (s?.id) map[String(s.id)] = String(s.name ?? s.storeName ?? s.storeCode ?? s.id)
    }
    setStoreMap(map)
  }, [])

  const getStoreName = useCallback(
    (storeId?: string, fallback?: string) => {
      if (!storeId) return fallback || ""
      return storeMap[String(storeId)] ?? fallback ?? String(storeId)
    },
    [storeMap],
  )

  // 載入用戶資料
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)

      // 1) 基本資料
      const registeredUsers = safeJSON<any[]>(localStorage.getItem("registeredUsers"), [])
      const basicUser = registeredUsers.find((u) => u?.id === userId)
      if (!basicUser) throw new Error("找不到用戶資料")

      // 2) 詳細資料
      const orders = safeJSON<Order[]>(localStorage.getItem("orders"), [])
      const userOrders = orders.filter((o) => o?.userId === userId)

      const favorites = safeJSON<any[]>(localStorage.getItem(`user_${userId}_favorites`), [])
      const recentViews = safeJSON<any[]>(localStorage.getItem(`user_${userId}_recentViews`), [])
      const cart = safeJSON<any[]>(localStorage.getItem(`user_${userId}_cart`), [])

      const full: UserFullData = {
        ...basicUser,
        favorites,
        recentViews,
        cart,
        activeOrders: userOrders.filter((o) => ["pending", "accepted", "prepared"].includes(String(o?.status))),
        orderHistory: userOrders.filter((o) => ["completed", "cancelled", "rejected"].includes(String(o?.status))),
      }

      // 可選：快取一份
      localStorage.setItem(`user_${userId}_data`, JSON.stringify(full))

      setUserData(full)
      // 同步店家快取
      loadStoresMap()
    } catch (e) {
      console.error("載入用戶資料時發生錯誤:", e)
      toast({
        title: "錯誤",
        description: "載入用戶資料時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [userId, loadStoresMap])

  // 初始化 + 監聽
  useEffect(() => {
    if (!isOpen || !userId) return

    loadUserData()

    const handleDataUpdate = () => {
      loadUserData()
    }

    const events = [USER_DATA_UPDATED, FAVORITES_UPDATED, RECENT_VIEWS_UPDATED, CART_UPDATED, ORDER_DATA_UPDATED]
    events.forEach((ev) => window.addEventListener(ev as any, handleDataUpdate as EventListener))

    const handleStorageChange = (e: StorageEvent) => {
      const relevantKeys = new Set([
        "registeredUsers",
        `user_${userId}_favorites`,
        `user_${userId}_recentViews`,
        `user_${userId}_cart`,
        "orders",
      ])
      if (e.key && relevantKeys.has(e.key)) loadUserData()
    }
    window.addEventListener("storage", handleStorageChange)

    const timer = setInterval(loadUserData, 5000)

    return () => {
      events.forEach((ev) => window.removeEventListener(ev as any, handleDataUpdate as EventListener))
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(timer)
    }
  }, [isOpen, userId, loadUserData])

  // 更新基本資料
  const handleUpdateUserData = async (updates: Partial<UserFullData>) => {
    if (!userData) return
    try {
      const ok = await updateUserData(userId, { ...userData, ...updates })
      if (ok) {
        onUpdate?.()
        loadUserData()
      }
    } catch (e) {
      console.error("更新用戶資料時發生錯誤:", e)
      toast({ title: "錯誤", description: "更新用戶資料時發生錯誤", variant: "destructive" })
    }
  }

  // 更新收藏
  const handleUpdateFavorites = async (favorites: UserFullData["favorites"]) => {
    try {
      const ok = await updateUserFavorites(userId, favorites)
      if (ok) loadUserData()
    } catch (e) {
      console.error("更新收藏列表時發生錯誤:", e)
      toast({ title: "錯誤", description: "更新收藏列表時發生錯誤", variant: "destructive" })
    }
  }

  // 更新瀏覽
  const handleUpdateRecentViews = async (recentViews: UserFullData["recentViews"]) => {
    try {
      const ok = await updateUserRecentViews(userId, recentViews)
      if (ok) loadUserData()
    } catch (e) {
      console.error("更新近期瀏覽時發生錯誤:", e)
      toast({ title: "錯誤", description: "更新近期瀏覽時發生錯誤", variant: "destructive" })
    }
  }

  // 更新購物車
  const handleUpdateCart = async (cart: UserFullData["cart"]) => {
    try {
      const ok = await updateUserCart(userId, cart)
      if (ok) loadUserData()
    } catch (e) {
      console.error("更新購物車時發生錯誤:", e)
      toast({ title: "錯誤", description: "更新購物車時發生錯誤", variant: "destructive" })
    }
  }

  // 切換帳號啟用/停用
  const toggleUserStatus = async () => {
    if (!userData) return
    try {
      const newStatus = !userData.isDisabled
      await handleUpdateUserData({ isDisabled: newStatus })

      // 若停用且為目前登入者 → 登出（保守處理）
      const cur = safeJSON<any>(localStorage.getItem("currentUser"), null)
      if (newStatus && cur?.id === userId) {
        localStorage.removeItem("currentUser")
      }

      toast({ title: "更新成功", description: `用戶帳號已${newStatus ? "停用" : "啟用"}` })
    } catch (e) {
      console.error("切換用戶狀態時發生錯誤:", e)
      toast({ title: "錯誤", description: "切換用戶狀態時發生錯誤", variant: "destructive" })
    }
  }

  // 訂單狀態
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const ok = await syncOrderStatus(orderId, newStatus, "admin")
      if (ok) {
        loadUserData()
        toast({ title: "更新成功", description: "訂單狀態已更新" })
      }
    } catch (e) {
      console.error("更新訂單狀態時發生錯誤:", e)
      toast({ title: "錯誤", description: "更新訂單狀態時發生錯誤", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl">
          <div className="flex justify-center items-center h-40">
            <p>載入中...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!userData) return null

  // 視圖資料（保護性處理）
  const favoritesArr = Array.isArray(userData.favorites) ? userData.favorites : []
  const recentArr = Array.isArray(userData.recentViews) ? userData.recentViews : []
  const cartArr = Array.isArray(userData.cart) ? userData.cart : []
  const activeOrders = Array.isArray(userData.activeOrders) ? userData.activeOrders : []
  const orderHistory = Array.isArray(userData.orderHistory) ? userData.orderHistory : []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">用戶詳細資料</DialogTitle>
          <DialogDescription>
            查看用戶 {userData.name} ({userData.username}) 的詳細資訊
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 px-6">
            <TabsTrigger value="info">基本資料</TabsTrigger>
            <TabsTrigger value="favorites">我的最愛</TabsTrigger>
            <TabsTrigger value="recent">近期瀏覽</TabsTrigger>
            <TabsTrigger value="cart">購物車</TabsTrigger>
            <TabsTrigger value="orders">訂單記錄</TabsTrigger>
          </TabsList>

          {/* 基本資料 */}
          <TabsContent value="info" className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* 帳號資訊 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">帳號資訊</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>用戶名</Label>
                    <Input value={userData.username} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>密碼</Label>
                    <Input value={userData.password} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>帳號狀態</Label>
                    <div className="flex items-center space-x-2">
                      <Switch checked={!userData.isDisabled} onCheckedChange={toggleUserStatus} />
                      <span>{userData.isDisabled ? "已停用" : "使用中"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 個人資訊 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">個人資訊</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>姓名</Label>
                    <Input value={userData.name} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>電子郵件</Label>
                    <Input value={userData.email} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>手機號碼</Label>
                    <Input value={userData.phone || "未設定"} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>系所</Label>
                    <Input value={userData.department || "未設定"} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>學號</Label>
                    <Input value={userData.studentId || "未設定"} readOnly />
                  </div>
                </div>
              </div>

              {/* 通知設定 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">通知設定</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label>電子郵件通知</Label>
                    <Switch
                      checked={!!userData.notificationSettings?.email}
                      onCheckedChange={(checked) =>
                        handleUpdateUserData({
                          notificationSettings: { ...userData.notificationSettings, email: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>推播通知</Label>
                    <Switch
                      checked={!!userData.notificationSettings?.push}
                      onCheckedChange={(checked) =>
                        handleUpdateUserData({
                          notificationSettings: { ...userData.notificationSettings, push: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>訂單更新通知</Label>
                    <Switch
                      checked={!!userData.notificationSettings?.orderUpdates}
                      onCheckedChange={(checked) =>
                        handleUpdateUserData({
                          notificationSettings: { ...userData.notificationSettings, orderUpdates: checked },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>優惠活動通知</Label>
                    <Switch
                      checked={!!userData.notificationSettings?.promotions}
                      onCheckedChange={(checked) =>
                        handleUpdateUserData({
                          notificationSettings: { ...userData.notificationSettings, promotions: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 我的最愛 */}
          <TabsContent value="favorites" className="flex-1 overflow-auto p-6 mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>我的最愛</CardTitle>
                <Button variant="outline" onClick={() => handleUpdateFavorites([])}>
                  清空列表
                </Button>
              </CardHeader>
              <CardContent>
                {favoritesArr.length === 0 ? (
                  <p className="text-muted-foreground">尚無收藏項目</p>
                ) : (
                  <ul className="space-y-2">
                    {favoritesArr.map((item, i) => {
                      const id = typeof item === "string" ? item : item?.id ?? item?.storeId
                      const name =
                        (typeof item === "object" && (item?.name || item?.storeName)) || getStoreName(item?.storeId, "")
                      const price = typeof item === "object" ? item?.price : undefined
                      const storeName = getStoreName((item as any)?.storeId, (item as any)?.store)

                      return (
                        <li key={makeKey("fav", { id }, i)} className="p-4 border rounded-lg hover:bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{name || id}</p>
                              <p className="text-sm text-muted-foreground">{storeName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {price != null && <p className="text-primary">${Number(price)}</p>}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const next = favoritesArr.filter((f: any) => {
                                    const fid = typeof f === "string" ? f : f?.id ?? f?.storeId
                                    return fid !== id
                                  })
                                  handleUpdateFavorites(next as any)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 近期瀏覽 */}
          <TabsContent value="recent" className="flex-1 overflow-auto p-6 mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>近期瀏覽</CardTitle>
                <Button variant="outline" onClick={() => handleUpdateRecentViews([])}>
                  清除記錄
                </Button>
              </CardHeader>
              <CardContent>
                {recentArr.length === 0 ? (
                  <p className="text-muted-foreground">尚無瀏覽紀錄</p>
                ) : (
                  <ul className="space-y-2">
                    {recentArr.map((item: any, i) => {
                      const id = typeof item === "string" ? item : item?.id ?? item?.storeId
                      const name =
                        (typeof item === "object" && (item?.name || item?.storeName)) || getStoreName(item?.storeId, "")
                      const storeName = getStoreName(item?.storeId, item?.store)
                      const viewedAt = typeof item === "object" ? item?.viewedAt : undefined

                      return (
                        <li key={makeKey("recent", { id }, i)} className="p-4 border rounded-lg hover:bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{name || id}</p>
                              <p className="text-sm text-muted-foreground">{storeName}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{formatDateTimeTW(viewedAt)}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 購物車 */}
          <TabsContent value="cart" className="flex-1 overflow-auto p-6 mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>購物車</CardTitle>
                <Button variant="outline" onClick={() => handleUpdateCart([])}>
                  清空購物車
                </Button>
              </CardHeader>
              <CardContent>
                {cartArr.length === 0 ? (
                  <p className="text-muted-foreground">購物車是空的</p>
                ) : (
                  <ul className="space-y-2">
                    {cartArr.map((item: any, i) => {
                      const id = typeof item === "string" ? item : item?.id
                      const name = typeof item === "object" ? item?.name : String(id)
                      const qty = typeof item === "object" ? Number(item?.quantity ?? 0) : 0
                      const price = typeof item === "object" ? Number(item?.price ?? 0) : 0
                      const storeName = getStoreName(item?.storeId, item?.store)

                      return (
                        <li key={makeKey("cart", { id }, i)} className="p-4 border rounded-lg hover:bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{name}</p>
                              <p className="text-sm text-muted-foreground">{storeName}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${price * qty}</p>
                              <p className="text-sm text-muted-foreground">數量: {qty}</p>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 訂單記錄 */}
          <TabsContent value="orders" className="flex-1 overflow-auto p-6 mt-0">
            <div className="space-y-6">
              {/* 進行中訂單 */}
              <Card>
                <CardHeader>
                  <CardTitle>進行中訂單</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeOrders.length === 0 ? (
                    <p className="text-muted-foreground">無進行中的訂單</p>
                  ) : (
                    <ul className="space-y-2">
                      {activeOrders.map((order: any, i) => {
                        const storeName = getStoreName(order?.storeId, order?.store)
                        return (
                          <li key={makeKey("active-order", { id: order?.id }, i)} className="p-4 border rounded-lg hover:bg-muted/50">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">訂單編號: {order?.id}</p>
                                <p className="text-sm text-muted-foreground">{storeName}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${Number(order?.total ?? 0)}</p>
                                <Badge variant="outline" className="ml-2">
                                  {String(order?.status)}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              建立時間: {formatDateTimeTW(order?.createdAt)}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleUpdateOrderStatus(String(order?.id), "completed")}>
                                完成訂單
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleUpdateOrderStatus(String(order?.id), "cancelled")}>
                                取消訂單
                              </Button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* 歷史訂單 */}
              <Card>
                <CardHeader>
                  <CardTitle>歷史訂單</CardTitle>
                </CardHeader>
                <CardContent>
                  {orderHistory.length === 0 ? (
                    <p className="text-muted-foreground">尚無訂單紀錄</p>
                  ) : (
                    <ul className="space-y-2">
                      {orderHistory.map((order: any, i) => {
                        const storeName = getStoreName(order?.storeId, order?.store)
                        const statusText = String(order?.status) === "completed" ? "已完成" : "已取消"
                        const timeLabel = String(order?.status) === "completed" ? "完成" : "取消"
                        const timeValue =
                          String(order?.status) === "completed"
                            ? formatDateTimeTW(order?.completedAt)
                            : formatDateTimeTW(order?.cancelledAt)

                        return (
                          <li key={makeKey("history-order", { id: order?.id }, i)} className="p-4 border rounded-lg hover:bg-muted/50">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">訂單編號: {order?.id}</p>
                                <p className="text-sm text-muted-foreground">{storeName}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${Number(order?.total ?? 0)}</p>
                                <Badge variant="outline" className="ml-2">
                                  {statusText}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {timeLabel}時間: {timeValue}
                            </div>
                            {order?.cancelReason && (
                              <div className="mt-2 text-sm text-red-500">取消原因: {order.cancelReason}</div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
