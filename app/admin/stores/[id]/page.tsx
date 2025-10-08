"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Eye, EyeOff, RefreshCw, Edit, Trash2 } from "lucide-react"
import Image from "next/image"

interface StoreDetail {
  id: string
  username: string
  password_hash: string
  name: string
  description: string | null
  location: string
  phone: string | null
  email: string | null
  is_disabled: boolean
  created_at: string
}

interface Product {
  id: string
  name: string
  description: string | null
  original_price: number | null
  discount_price: number
  quantity: number
  expiry_date: string | null
  image_url: string | null
  is_available: boolean
  created_at: string
}

interface Order {
  id: string
  user_id: string
  store_id: string
  total_amount: number
  status: string
  created_at: string
  users?: {
    name: string
  }
}

export default function AdminStoreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string

  const [store, setStore] = useState<StoreDetail | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  // 載入店家詳情
  const loadStoreDetail = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/stores/${storeId}`)
      const data = await response.json()

      if (data.success) {
        setStore(data.store)
        setProducts(data.products)
        setOrders(data.orders)
      } else {
        throw new Error(data.message || "載入失敗")
      }
    } catch (error) {
      console.error("載入店家詳情錯誤:", error)
      toast({
        title: "錯誤",
        description: "載入店家詳情失敗",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storeId) {
      loadStoreDetail()
    }
  }, [storeId])

  // 計算營業統計
  const stats = {
    totalProducts: products.length,
    availableProducts: products.filter(p => p.is_available).length,
    totalOrders: orders.length,
    completedOrders: orders.filter(o => o.status === "completed").length,
    totalRevenue: orders.filter(o => o.status === "completed").reduce((sum, o) => sum + o.total_amount, 0),
    pendingOrders: orders.filter(o => o.status === "pending").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground mb-4">找不到店家資料</p>
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
        返回店家列表
      </Button>

      {/* 店家基本資料 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>店家基本資料</CardTitle>
          <Button onClick={() => router.push(`/admin/stores/${storeId}/edit`)}>
            編輯資料
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">店家名稱</div>
              <div className="text-lg font-medium">{store.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">帳號</div>
              <div className="text-lg font-medium">{store.username}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">密碼</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono">
                  {showPassword ? store.password_hash : "•".repeat(12)}
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
              <div className="text-sm text-muted-foreground">聯絡電話</div>
              <div className="text-lg">{store.phone || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">電子郵件</div>
              <div className="text-lg">{store.email || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">地址</div>
              <div className="text-lg">{store.location}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">店家描述</div>
              <div className="text-lg">{store.description || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">狀態</div>
              <div className={`text-lg ${store.is_disabled ? "text-red-600" : "text-green-600"}`}>
                {store.is_disabled ? "已停用" : "營業中"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">註冊時間</div>
              <div className="text-lg">
                {new Date(store.created_at).toLocaleDateString("zh-TW")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 營業統計 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">商品總數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">上架商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.availableProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">訂單總數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">待處理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">總營收</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${stats.totalRevenue}</div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細資料標籤 */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">
            商品管理 ({products.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            訂單記錄 ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* 商品管理 */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>商品列表</CardTitle>
              <Button onClick={() => router.push(`/admin/stores/${storeId}/products/new`)}>
                新增商品
              </Button>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">尚無商品</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">圖片</TableHead>
                        <TableHead>商品名稱</TableHead>
                        <TableHead>原價</TableHead>
                        <TableHead>特價</TableHead>
                        <TableHead>庫存</TableHead>
                        <TableHead>到期時間</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            {product.image_url ? (
                              <div className="relative w-16 h-16 rounded-md overflow-hidden">
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">無圖片</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>${product.original_price || "-"}</TableCell>
                          <TableCell className="text-green-600 font-bold">${product.discount_price}</TableCell>
                          <TableCell>{product.quantity}</TableCell>
                          <TableCell className="text-sm">
                            {product.expiry_date
                              ? new Date(product.expiry_date).toLocaleString("zh-TW")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              product.is_available
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {product.is_available ? "已上架" : "已下架"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/admin/stores/${storeId}/products/edit/${product.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                編輯
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="pb-3 bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">訂單編號</div>
                            <div className="font-mono font-medium">{order.id.substring(0, 8)}</div>
                          </div>
                          <Badge
                            className={
                              order.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : order.status === "cancelled" || order.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : order.status === "prepared"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
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
                      <CardContent className="pt-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">顧客姓名</span>
                            <span className="font-medium">{order.users?.name || "未知客戶"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">下單時間</span>
                            <span>{new Date(order.created_at).toLocaleString("zh-TW")}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="font-medium">訂單金額</span>
                            <span className="text-lg font-bold text-primary">
                              ${order.total_amount}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => router.push(`/admin/orders/${order.id}?from=store`)}
                          >
                            查看詳情
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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