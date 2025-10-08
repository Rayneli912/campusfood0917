"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { OrderIdDisplay, OrderStatusBadge } from "@/components/order-display"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { useStoreAuth } from "@/components/store-auth-provider"

export default function StoreOrdersPage() {
  const router = useRouter()
  const { account, loading } = useStoreAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // ✅ 從數據庫API獲取訂單
  const loadOrders = async () => {
    if (!account?.id) return

    try {
      console.log("📥 店家訂單頁面：獲取訂單，storeId:", account.id)
      const res = await fetch(`/api/orders?storeId=${account.id}`, {
        cache: "no-store"
      })

      if (!res.ok) {
        console.error("❌ 獲取訂單失敗:", res.status)
        setOrders([])
        return
      }

      const json = await res.json()
      console.log("✅ 店家訂單頁面：訂單數據:", json)

      if (json.success && json.orders) {
        const storeOrders = json.orders.map((o: any) => ({
          id: o.id,
          userId: o.user_id || o.userId,
          storeId: o.store_id || o.storeId,
          storeName: o.store_name || o.storeName,
          status: o.status,
          createdAt: o.created_at || o.createdAt,
          updatedAt: o.updated_at || o.updatedAt,
          total: Number(o.total || 0),
          items: (o.order_items || o.items || []).map((item: any) => ({
            id: item.product_id || item.id,
            name: item.product_name || item.name,
            price: Number(item.price),
            quantity: Number(item.quantity),
          })),
          customerInfo: o.customer_info || o.customerInfo,
          note: o.note,
        }))
        setOrders(storeOrders)
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error("❌ 加載訂單錯誤:", error)
      setOrders([])
    }
  }

  useEffect(() => {
    // ✅ 添加延迟确保 Provider 完全初始化
    const checkAuthTimer = setTimeout(() => {
      if (!loading && !account) {
        console.log("❌ Orders: 检查后确认未登入，重定向到登录页面")
        router.push("/login?tab=store")
      } else if (account) {
        console.log("✅ Orders: 已登入店家，加载订单")
        loadOrders()
      }
    }, 300)

    return () => clearTimeout(checkAuthTimer)
  }, [account, loading, router])

  // 監聽訂單狀態更新
  useEffect(() => {
    const handleOrderUpdate = () => {
      loadOrders() // 重新加載訂單列表
    }

    window.addEventListener("orderStatusUpdated", handleOrderUpdate)
    return () => window.removeEventListener("orderStatusUpdated", handleOrderUpdate)
  }, [account])

  // 過濾訂單
  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase()
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.customerInfo?.name?.toLowerCase().includes(searchLower) ||
      order.customerInfo?.phone?.includes(searchQuery) ||
      order.items.some((item: any) => item.name.toLowerCase().includes(searchLower))
    )
  })

  // 查看訂單詳情
  const handleViewOrder = (orderId: string) => {
    router.push(`/store/orders/${orderId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">訂單管理</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜尋訂單..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <OrderIdDisplay
                    orderId={order.id}
                    showStoreCode={false}
                    className="text-lg font-medium"
                  />
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">訂單金額</span>
                  <span className="font-medium">${order.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">商品數量</span>
                  <span className="font-medium">
                    {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} 件
                  </span>
                </div>
                {order.customerInfo && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">顧客資訊</span>
                    <span className="font-medium">
                      {order.customerInfo.name} ({order.customerInfo.phone})
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleViewOrder(order.id)}
                >
                  查看詳情
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-muted/10 rounded-lg">
            <p className="text-muted-foreground">沒有找到符合條件的訂單</p>
          </div>
        )}
      </div>
    </div>
  )
}
