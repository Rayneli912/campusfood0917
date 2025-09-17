"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStoreAuth } from "@/components/store-auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Clock, CheckCircle, AlertCircle, RefreshCcw, Search, Package, ClipboardList } from "lucide-react"
import { OrderCard } from "@/components/order-card"
import { syncOrderStatus } from "@/lib/sync-service"
import { Badge } from "@/components/ui/badge"
import { getFoodItemsByStoreId } from "@/lib/food-item-service"

export default function StoreDashboardPage() {
  const { account, loading } = useStoreAuth()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [products, setProducts] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [storeInfo, setStoreInfo] = useState<any>(null)

  // 檢查是否已登入
  useEffect(() => {
    if (!loading && !account) {
      router.push("/login?tab=store")
    }
  }, [account, loading, router])

  // 載入店家資訊
  useEffect(() => {
    if (!account) return

    const loadStoreInfo = () => {
      try {
        const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
        const store = registeredStores.find((s: any) => s.id === account.storeId)
        if (store) {
          setStoreInfo(store)
        }
      } catch (error) {
        console.error("Error loading store info:", error)
      }
    }

    loadStoreInfo()

    // 監聽店家資訊更新事件
    const handleStoreUpdate = () => {
      loadStoreInfo()
    }

    window.addEventListener("storeUpdated", handleStoreUpdate)

    return () => {
      window.removeEventListener("storeUpdated", handleStoreUpdate)
    }
  }, [account])

  // 載入訂單和商品數據
  useEffect(() => {
    if (!account) return

    const loadStoreData = async () => {
      try {
        // 從 localStorage 獲取訂單
        const ordersStr = localStorage.getItem("orders")
        if (ordersStr) {
          const allOrders = JSON.parse(ordersStr)
          // 過濾屬於當前店家的訂單
          const storeOrders = allOrders.filter((order) => order.storeId === account.storeId)

          // 按創建時間排序，由新到舊
          storeOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

          setOrders(storeOrders)
        } else {
          setOrders([])
        }

        // 直接從 data.ts 中獲取商品數據
        const storeProducts = await getFoodItemsByStoreId(account.storeId)
        setProducts(storeProducts || [])
      } catch (error) {
        console.error("Error loading data:", error)
        setOrders([])
        setProducts([])
      }
    }

    loadStoreData()

    // 監聽訂單狀態變化
    const handleOrderStatusUpdate = (e) => {
      try {
        const ordersStr = localStorage.getItem("orders")
        if (ordersStr) {
          const allOrders = JSON.parse(ordersStr)
          const storeOrders = allOrders.filter((order) => order.storeId === account.storeId)

          // 按創建時間排序，由新到舊
          storeOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

          setOrders(storeOrders)
        }
      } catch (error) {
        console.error("Error updating orders:", error)
      }
    }

    // 監聽新訂單
    const handleNewOrder = (e) => {
      if (e.detail && e.detail.order) {
        const newOrder = e.detail.order
        if (newOrder.storeId === account.storeId) {
          setOrders((prevOrders) => {
            // 添加新訂單並重新排序
            const updatedOrders = [...prevOrders, newOrder]
            return updatedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          })
        }
      }
    }

    // 監聽商品數據變化
    const handleProductsUpdate = () => {
      try {
        const storeProducts = getFoodItemsByStoreId(account.storeId)
        setProducts(storeProducts || [])
      } catch (error) {
        console.error("Error updating products:", error)
      }
    }

    window.addEventListener("orderStatusUpdated", handleOrderStatusUpdate)
    window.addEventListener("newOrder", handleNewOrder)
    window.addEventListener("foodItemsUpdated", handleProductsUpdate)
    window.addEventListener("foodItemDeleted", handleProductsUpdate)

    return () => {
      window.removeEventListener("orderStatusUpdated", handleOrderStatusUpdate)
      window.removeEventListener("newOrder", handleNewOrder)
      window.removeEventListener("foodItemsUpdated", handleProductsUpdate)
      window.removeEventListener("foodItemDeleted", handleProductsUpdate)
    }
  }, [account])

  // 根據狀態分類訂單
  const ordersByStatus = {
    pending: orders.filter((order) => order.status === "pending"),
    accepted: orders.filter((order) => order.status === "accepted"),
    prepared: orders.filter((order) => order.status === "prepared"),
    completed: orders.filter((order) => order.status === "completed"),
    cancelled: orders.filter((order) => order.status === "cancelled" || order.status === "rejected"),
  }

  // 根據搜尋詞過濾訂單
  const filteredOrders = orders.filter((order) => {
    // 先根據標籤過濾
    if (activeTab !== "all" && order.status !== activeTab) {
      return false
    }

    // 再根據搜尋詞過濾
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.id.toLowerCase().includes(query) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(query)) ||
        (order.customer?.phone && order.customer.phone.includes(query)) ||
        order.items.some((item) => item.name.toLowerCase().includes(query))
      )
    }

    return true
  })

  // 處理訂單狀態更新
  const handleOrderStatusUpdate = async (orderId, newStatus, cancelledBy, reason) => {
    try {
      // 同步到用戶端
      const success = await syncOrderStatus(orderId, newStatus, cancelledBy, reason)

      if (success) {
        // 更新本地訂單狀態
        setOrders((prevOrders) =>
          prevOrders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)),
        )

        // 如果訂單狀態變為已完成，更新銷售數據
        if (newStatus === "completed") {
          // 找到對應的訂單
          const completedOrder = orders.find((order) => order.id === orderId)
          if (completedOrder) {
            // 更新訂單完成時間
            const updatedOrder = {
              ...completedOrder,
              status: "completed",
              completedAt: new Date().toISOString(),
            }

            // 更新 localStorage 中的訂單
            const ordersStr = localStorage.getItem("orders")
            if (ordersStr) {
              const allOrders = JSON.parse(ordersStr)
              const updatedOrders = allOrders.map((order) => (order.id === orderId ? updatedOrder : order))
              localStorage.setItem("orders", JSON.stringify(updatedOrders))
            }

            // 觸發銷售數據更新事件
            const salesUpdateEvent = new CustomEvent("salesDataUpdated", {
              detail: { orderId, storeId: completedOrder.storeId },
            })
            window.dispatchEvent(salesUpdateEvent)
          }
        }
      }
    } catch (error) {
      console.error("Error updating order status:", error)
    }
  }

  // 處理訂單接受
  const handleAcceptOrder = (orderId) => {
    handleOrderStatusUpdate(orderId, "accepted")
  }

  // 處理訂單準備完成
  const handlePrepareOrder = (orderId) => {
    handleOrderStatusUpdate(orderId, "prepared")
  }

  // 處理訂單完成
  const handleCompleteOrder = (orderId) => {
    handleOrderStatusUpdate(orderId, "completed")
  }

  // 處理訂單取消
  const handleCancelOrder = (orderId, reason) => {
    handleOrderStatusUpdate(orderId, "cancelled", "store", reason)
  }

  // 處理訂單拒絕
  const handleRejectOrder = (orderId, reason) => {
    handleOrderStatusUpdate(orderId, "rejected", "store", reason)
  }

  // 處理營業狀態切換
  const handleToggleOpen = () => {
    setIsOpen(!isOpen)
  }

  // 處理刷新
  const handleRefresh = () => {
    if (!account) return

    setIsRefreshing(true)

    try {
      // 刷新訂單數據
      const ordersStr = localStorage.getItem("orders")
      if (ordersStr) {
        const allOrders = JSON.parse(ordersStr)
        const storeOrders = allOrders.filter((order) => order.storeId === account.storeId)

        // 按創建時間排序，由新到舊
        storeOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setOrders(storeOrders)
      }

      // 刷新商品數據
      const storeProducts = getFoodItemsByStoreId(account.storeId)
      setProducts(storeProducts || [])
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setTimeout(() => {
        setIsRefreshing(false)
      }, 500)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">載入中...</div>
  }

  if (!account) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">店家儀表板</h1>
          <p className="text-muted-foreground">
            歡迎回來，{storeInfo?.name || account?.storeName}
            {storeInfo && (
              <span className="ml-2 text-sm text-gray-500">
                (店家代號: {storeInfo.storeCode})
              </span>
            )}
            ，管理您的訂單和商品。
          </p>
        </div>
        <div className="flex items-center mt-4 md:mt-0">
          <div className="flex items-center space-x-2">
            <Switch id="store-open" checked={isOpen} onCheckedChange={handleToggleOpen} />
            <Label htmlFor="store-open" className="font-medium">
              {isOpen ? "營業中" : "休息中"}
            </Label>
          </div>
        </div>
      </div>

      {/* 統計卡片 - 改進的響應式設計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-800 font-medium text-sm md:text-base">商品數量</p>
                <h3 className="text-2xl md:text-3xl font-bold text-amber-900 mt-1">{products.length}</h3>
                <p className="text-amber-700 text-xs md:text-sm mt-1">所有商品總數</p>
              </div>
              <Package className="h-8 w-8 md:h-10 md:w-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium text-sm md:text-base">待處理訂單</p>
                <h3 className="text-2xl md:text-3xl font-bold text-blue-900 mt-1">{ordersByStatus.pending.length}</h3>
                <p className="text-blue-700 text-xs md:text-sm mt-1">需要確認的訂單</p>
              </div>
              <Clock className="h-8 w-8 md:h-10 md:w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-medium text-sm md:text-base">已準備訂單</p>
                <h3 className="text-2xl md:text-3xl font-bold text-green-900 mt-1">{ordersByStatus.prepared.length}</h3>
                <p className="text-green-700 text-xs md:text-sm mt-1">等待顧客取餐</p>
              </div>
              <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-800 font-medium text-sm md:text-base">總訂單數</p>
                <h3 className="text-2xl md:text-3xl font-bold text-purple-900 mt-1">{orders.length}</h3>
                <p className="text-purple-700 text-xs md:text-sm mt-1">所有訂單總數</p>
              </div>
              <ClipboardList className="h-8 w-8 md:h-10 md:w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 訂單管理 - 改進的響應式設計 */}
      <Card className="mb-8 border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl">訂單管理</CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                管理您的訂單，接受或拒絕新訂單，追蹤訂單狀態。
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋訂單..."
                  className="pl-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-9 px-3">
                <RefreshCcw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          {/* 改進的標籤導航 */}
          <div className="px-4 md:px-6 overflow-x-auto">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4 h-auto p-1">
                <TabsTrigger value="all" className="py-1.5 text-xs md:text-sm">
                  全部
                </TabsTrigger>

                {/* 待處理標籤 - 只有當有訂單時才顯示橘色泡泡 */}
                <TabsTrigger value="pending" className="relative py-1.5 text-xs md:text-sm">
                  待處理
                  {ordersByStatus.pending.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0 min-w-5 h-5 text-xs">
                      {ordersByStatus.pending.length}
                    </Badge>
                  )}
                </TabsTrigger>

                {/* 準備中標籤 - 只有當有訂單時才顯示橘色泡泡 */}
                <TabsTrigger value="accepted" className="relative py-1.5 text-xs md:text-sm">
                  準備中
                  {ordersByStatus.accepted.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0 min-w-5 h-5 text-xs">
                      {ordersByStatus.accepted.length}
                    </Badge>
                  )}
                </TabsTrigger>

                {/* 已準備標籤 - 只有當有訂單時才顯示橘色泡泡 */}
                <TabsTrigger value="prepared" className="relative py-1.5 text-xs md:text-sm">
                  已準備
                  {ordersByStatus.prepared.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0 min-w-5 h-5 text-xs">
                      {ordersByStatus.prepared.length}
                    </Badge>
                  )}
                </TabsTrigger>

                {/* 已完成標籤 - 不顯示橘色泡泡 */}
                <TabsTrigger value="completed" className="py-1.5 text-xs md:text-sm">
                  已完成
                </TabsTrigger>

                {/* 已取消標籤 - 不顯示橘色泡泡 */}
                <TabsTrigger value="cancelled" className="py-1.5 text-xs md:text-sm">
                  已取消
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                <div className="space-y-3 md:space-y-4 px-0 pb-4">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAccept={() => handleAcceptOrder(order.id)}
                        onPrepare={() => handlePrepareOrder(order.id)}
                        onComplete={() => handleCompleteOrder(order.id)}
                        onCancel={(reason) => handleCancelOrder(order.id, reason)}
                        onReject={(reason) => handleRejectOrder(order.id, reason)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 md:py-12 bg-gray-50 rounded-lg mx-4">
                      <AlertCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-gray-400" />
                      <h2 className="text-lg md:text-xl font-medium mb-1 md:mb-2">沒有訂單</h2>
                      <p className="text-gray-500 text-sm md:text-base mb-4">
                        {searchQuery ? "沒有符合搜尋條件的訂單" : "目前沒有符合條件的訂單"}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
