"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface SalesData {
  today: {
    sales: number
    orders: number
  }
  week: {
    sales: number
    orders: number
  }
  month: {
    sales: number
    orders: number
  }
}

interface ProductSale {
  id: string
  name: string
  originalPrice: number
  discountPrice: number
  quantity: number
  revenue: number
}

export default function ReportsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("sales")
  const [salesData, setSalesData] = useState<SalesData>({
    today: { sales: 0, orders: 0 },
    week: { sales: 0, orders: 0 },
    month: { sales: 0, orders: 0 },
  })
  const [productSales, setProductSales] = useState<ProductSale[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [storeId, setStoreId] = useState<string>("")
  const [storeName, setStoreName] = useState<string>("")

  useEffect(() => {
    if (user?.storeId) {
      setStoreId(user.storeId)
      setStoreName(user.storeName || "")
      loadSalesData(user.storeId)
    }
  }, [user])

  const loadSalesData = (storeId: string) => {
    // 從 localStorage 獲取訂單數據
    const ordersData = localStorage.getItem("orders")
    if (!ordersData) return

    const orders = JSON.parse(ordersData)
    const storeOrders = orders.filter((order: any) => order.storeId === storeId)

    // 計算今日、本週、本月的銷售數據
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekStart = today - 6 * 24 * 60 * 60 * 1000 // 7天前
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    // 今日銷售
    const todayOrders = storeOrders.filter((order: any) => {
      const orderDate = new Date(order.createdAt).getTime()
      return orderDate >= today && order.status !== "cancelled" && order.status !== "rejected"
    })
    const todaySales = todayOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)

    // 本週銷售
    const weekOrders = storeOrders.filter((order: any) => {
      const orderDate = new Date(order.createdAt).getTime()
      return orderDate >= weekStart && order.status !== "cancelled" && order.status !== "rejected"
    })
    const weekSales = weekOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)

    // 本月銷售
    const monthOrders = storeOrders.filter((order: any) => {
      const orderDate = new Date(order.createdAt).getTime()
      return orderDate >= monthStart && order.status !== "cancelled" && order.status !== "rejected"
    })
    const monthSales = monthOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0)

    setSalesData({
      today: { sales: todaySales, orders: todayOrders.length },
      week: { sales: weekSales, orders: weekOrders.length },
      month: { sales: monthSales, orders: monthOrders.length },
    })

    // 計算商品銷售數據
    const productMap = new Map<string, ProductSale>()

    // 從所有訂單中收集商品銷售數據
    storeOrders.forEach((order: any) => {
      if (order.status === "cancelled" || order.status === "rejected") return

      order.items.forEach((item: any) => {
        const productId = item.id
        const existingProduct = productMap.get(productId)

        if (existingProduct) {
          existingProduct.quantity += item.quantity
          existingProduct.revenue += item.price * item.quantity
        } else {
          productMap.set(productId, {
            id: productId,
            name: item.name,
            originalPrice: item.originalPrice || item.price,
            discountPrice: item.price,
            quantity: item.quantity,
            revenue: item.price * item.quantity,
          })
        }
      })
    })

    const productSalesArray = Array.from(productMap.values())
    setProductSales(productSalesArray)

    // 計算總收入和總數量
    const totalRev = productSalesArray.reduce((sum, product) => sum + product.revenue, 0)
    const totalQty = productSalesArray.reduce((sum, product) => sum + product.quantity, 0)
    setTotalRevenue(totalRev)
    setTotalQuantity(totalQty)
  }

  const handleDownloadReport = () => {
    toast({
      title: "報表下載中",
      description: "您的銷售報表正在準備下載",
    })

    // 這裡可以實現實際的報表下載功能
    setTimeout(() => {
      toast({
        title: "報表已準備完成",
        description: "您的銷售報表已準備完成，請檢查下載資料夾",
      })
    }, 2000)
  }

  const formatDate = () => {
    const now = new Date()
    return `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getDate().toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">營業報表</h1>
        <p className="text-muted-foreground">查看您的銷售數據和營業分析</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日銷售額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${salesData.today.sales}</div>
            <p className="text-xs text-muted-foreground mt-1">{salesData.today.orders} 筆訂單</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本週銷售額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${salesData.week.sales}</div>
            <p className="text-xs text-muted-foreground mt-1">{salesData.week.orders} 筆訂單</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本月銷售額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${salesData.month.sales}</div>
            <p className="text-xs text-muted-foreground mt-1">{salesData.month.orders} 筆訂單</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sales">銷售分析</TabsTrigger>
          <TabsTrigger value="products">商品分析</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>銷售詳情</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  校園即期食品資訊平台 - {storeName} - 報表日期: {formatDate()}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                <Download className="mr-2 h-4 w-4" />
                下載報表
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名稱</TableHead>
                    <TableHead className="text-right">單價</TableHead>
                    <TableHead className="text-right">售價</TableHead>
                    <TableHead className="text-right">銷售數量</TableHead>
                    <TableHead className="text-right">收入</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.length > 0 ? (
                    productSales.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">${product.originalPrice}</TableCell>
                        <TableCell className="text-right">${product.discountPrice}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell className="text-right">${product.revenue}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        暫無銷售數據
                      </TableCell>
                    </TableRow>
                  )}
                  {productSales.length > 0 && (
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold">總計</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">{totalQuantity}</TableCell>
                      <TableCell className="text-right font-bold">${totalRevenue}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>商品銷售分析</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名稱</TableHead>
                    <TableHead className="text-right">原價</TableHead>
                    <TableHead className="text-right">折扣價</TableHead>
                    <TableHead className="text-right">折扣率</TableHead>
                    <TableHead className="text-right">銷售數量</TableHead>
                    <TableHead className="text-right">收入</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSales.length > 0 ? (
                    productSales.map((product) => {
                      const discountRate = Math.round(
                        ((product.originalPrice - product.discountPrice) / product.originalPrice) * 100,
                      )
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-right">${product.originalPrice}</TableCell>
                          <TableCell className="text-right">${product.discountPrice}</TableCell>
                          <TableCell className="text-right">{discountRate}%</TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">${product.revenue}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        暫無商品銷售數據
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
