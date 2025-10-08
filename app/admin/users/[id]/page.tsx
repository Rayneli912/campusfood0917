"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Eye, EyeOff, RefreshCw, Plus, Minus, Trash2 } from "lucide-react"

interface UserDetail {
  id: string
  username: string
  password: string
  name: string
  email: string | null
  phone: string
  department: string | null
  is_disabled: boolean
  created_at: string
}

interface FavoriteItem {
  id: string
  user_id: string
  store_id: string
  created_at: string
  stores?: {
    name: string
  }
}

interface RecentView {
  id: string
  user_id: string
  store_id: string
  viewed_at: string
  stores?: {
    name: string
  }
}

interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  products?: {
    name: string
    discount_price: number
  }
}

interface Order {
  id: string
  user_id: string
  store_id: string
  total_amount: number
  status: string
  created_at: string
  stores?: {
    name: string
  }
}

export default function AdminUserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [recentViews, setRecentViews] = useState<RecentView[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [updatingCart, setUpdatingCart] = useState<string | null>(null)

  // 載入用戶詳情
  const loadUserDetail = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setFavorites(data.favorites)
        setRecentViews(data.recentViews)
        setCartItems(data.cartItems)
        setOrders(data.orders)
      } else {
        throw new Error(data.message || "載入失敗")
      }
    } catch (error) {
      console.error("載入用戶詳情錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入用戶詳情失敗",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadUserDetail()
    }
  }, [userId])

  // 更新購物車項目數量
  const handleUpdateCartQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    
    setUpdatingCart(cartItemId)
    try {
      const response = await fetch(`/api/admin/cart/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity: newQuantity }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({ title: "更新成功", description: "購物車已更新" })
        await loadUserDetail()
      } else {
        toast({
          title: "更新失敗",
          description: result.message || "無法更新購物車",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("更新購物車錯誤:", error)
      toast({
        title: "錯誤",
        description: "更新購物車時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setUpdatingCart(null)
    }
  }

  // 刪除購物車項目
  const handleDeleteCartItem = async (cartItemId: string) => {
    setUpdatingCart(cartItemId)
    try {
      const response = await fetch(`/api/admin/cart/${userId}?itemId=${cartItemId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({ title: "刪除成功", description: "已從購物車移除" })
        await loadUserDetail()
      } else {
        toast({
          title: "刪除失敗",
          description: result.message || "無法刪除項目",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("刪除購物車錯誤:", error)
      toast({
        title: "錯誤",
        description: "刪除項目時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setUpdatingCart(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground mb-4">找不到用戶資料</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回用戶列表
      </Button>

      {/* 用戶基本資料 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>用戶基本資料</CardTitle>
          <Button onClick={() => router.push(`/admin/users/${userId}/edit`)}>
            編輯資料
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">姓名</div>
              <div className="text-lg font-medium">{user.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">帳號</div>
              <div className="text-lg font-medium">{user.username}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">密碼</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono">
                  {showPassword ? user.password : "•".repeat(8)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">電子郵件</div>
              <div className="text-lg">{user.email || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">手機號碼</div>
              <div className="text-lg">{user.phone}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">系所</div>
              <div className="text-lg">{user.department || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">狀態</div>
              <div className={`text-lg ${user.is_disabled ? "text-red-600" : "text-green-600"}`}>
                {user.is_disabled ? "已停用" : "使用中"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">註冊時間</div>
              <div className="text-lg">
                {new Date(user.created_at).toLocaleDateString("zh-TW")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 詳細資料標籤 */}
      <Tabs defaultValue="favorites" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="favorites">
            我的最愛 ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            近期瀏覽 ({recentViews.length})
          </TabsTrigger>
          <TabsTrigger value="cart">
            購物車 ({cartItems.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            訂單記錄 ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* 我的最愛 */}
        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle>我的最愛店家</CardTitle>
            </CardHeader>
            <CardContent>
              {favorites.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">尚無收藏的店家</p>
              ) : (
                <div className="space-y-2">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{fav.stores?.name || "未知店家"}</div>
                        <div className="text-sm text-muted-foreground">
                          收藏於 {new Date(fav.created_at).toLocaleDateString("zh-TW")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 近期瀏覽 */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>近期瀏覽記錄</CardTitle>
            </CardHeader>
            <CardContent>
              {recentViews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">尚無瀏覽記錄</p>
              ) : (
                <div className="space-y-2">
                  {recentViews.map((view) => (
                    <div key={view.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{view.stores?.name || "未知店家"}</div>
                        <div className="text-sm text-muted-foreground">
                          瀏覽於 {new Date(view.viewed_at).toLocaleString("zh-TW")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 購物車 */}
        <TabsContent value="cart">
          <Card>
            <CardHeader>
              <CardTitle>購物車內容</CardTitle>
            </CardHeader>
            <CardContent>
              {cartItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">購物車是空的</p>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.products?.name || "未知商品"}</div>
                        <div className="text-sm text-muted-foreground">
                          單價：${item.products?.discount_price}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updatingCart === item.id}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-2 font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                            disabled={updatingCart === item.id}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-lg font-bold min-w-[80px] text-right">
                          ${(item.products?.discount_price || 0) * item.quantity}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteCartItem(item.id)}
                          disabled={updatingCart === item.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>總計：</span>
                      <span>
                        ${cartItems.reduce((sum, item) => sum + (item.products?.discount_price || 0) * item.quantity, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 訂單記錄 */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>訂單記錄</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">尚無訂單記錄</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{order.stores?.name || "未知店家"}</div>
                        <div className={`px-2 py-1 rounded text-sm ${
                          order.status === "completed" ? "bg-green-100 text-green-800" :
                          order.status === "cancelled" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {order.status === "completed" ? "已完成" :
                           order.status === "cancelled" ? "已取消" :
                           order.status === "pending" ? "處理中" : order.status}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{new Date(order.created_at).toLocaleString("zh-TW")}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-foreground">${order.total_amount}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/orders/${order.id}?from=user`)}
                          >
                            查看詳情
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}