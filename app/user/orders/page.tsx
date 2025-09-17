"use client"

import { useState, useEffect } from "react"
import { useOrders } from "@/hooks/use-orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown, ChevronUp, Store, MapPin, User, Phone, Mail, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

export default function OrdersPage() {
  const { orderHistory } = useOrders()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    if (orderHistory) {
      setOrders(orderHistory)
    }
  }, [orderHistory])

  // 切換訂單詳情展開/收起
  const toggleOrderDetails = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null)
    } else {
      setExpandedOrderId(orderId)
    }
  }

  // 過濾訂單
  const filteredOrders = orders.filter((order) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        order.id.toLowerCase().includes(query) ||
        order.storeName.toLowerCase().includes(query) ||
        order.items.some((item: any) => item.name.toLowerCase().includes(query))
      )
    }
    return true
  })

  // 獲取訂單狀態對應的標籤
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            等待確認
          </Badge>
        )
      case "accepted":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            準備中
          </Badge>
        )
      case "prepared":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            已準備
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            已完成
          </Badge>
        )
      case "cancelled":
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            {status === "cancelled" ? "已取消" : "已拒絕"}
          </Badge>
        )
      default:
        return null
    }
  }

  // 格式化日期時間
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!mounted) {
    return <div className="container mx-auto px-4 py-8">載入中...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">訂單記錄</h1>
      <p className="text-muted-foreground mb-6">查看您的所有訂單記錄和狀態</p>

      {/* 搜尋欄 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜尋訂單..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 訂單列表 */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className={expandedOrderId === order.id ? "border-primary" : ""}>
              <CardContent className="p-4">
                {/* 訂單基本資訊 */}
                <div className="flex flex-col sm:flex-row items-start justify-between">
                  <div className="mb-2 sm:mb-0">
                    <div className="flex items-center mb-1">
                      <h3 className="font-medium mr-2">訂單 #{order.id}</h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}{" "}
                      {new Date(order.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {order.status === "prepared" && (
                      <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
                        <Link href={`/user/order-tracking?id=${order.id}`}>追蹤訂單</Link>
                      </Button>
                    )}
                    <Button
                      variant={expandedOrderId === order.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleOrderDetails(order.id)}
                      className="flex items-center"
                    >
                      {expandedOrderId === order.id ? (
                        <>
                          收起詳情 <ChevronUp className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          查看詳情 <ChevronDown className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm">
                    <span className="font-medium">{order.storeName}</span> · {order.items.length} 件商品 · $
                    {order.total}
                  </p>
                </div>

                {/* 展開的訂單詳情 */}
                {expandedOrderId === order.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {/* 訂單商品 */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">訂單商品</h4>
                      <div className="space-y-3">
                        {order.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0">
                              {item.image && (
                                <Image
                                  src={item.image || "/placeholder.svg"}
                                  alt={item.name}
                                  width={48}
                                  height={48}
                                  className="rounded-md object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-grow">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">x{item.quantity}</div>
                            </div>
                            <div className="font-medium">${item.price * item.quantity}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span>小計</span>
                          <span>${order.total}</span>
                        </div>
                        <div className="flex justify-between font-medium mt-1">
                          <span>總計</span>
                          <span>${order.total}</span>
                        </div>
                      </div>
                    </div>

                    {/* 店家資訊 */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <h4 className="text-sm font-medium mb-2">店家資訊</h4>
                      <div className="flex items-center">
                        <Store className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">{order.storeName}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm text-muted-foreground">{order.storeLocation || "校區"}</span>
                      </div>
                    </div>

                    {/* 取餐資訊 */}
                    {order.contact && (
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <h4 className="text-sm font-medium mb-2">取餐資訊</h4>
                        <div className="flex items-center mt-1">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">{order.contact.name}</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">{order.contact.phone}</span>
                        </div>
                        {order.contact.email && (
                          <div className="flex items-center mt-1">
                            <Mail className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm">{order.contact.email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 訂單歷程 */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">訂單歷程</h4>
                      <div className="relative">
                        {/* 時間軸線 */}
                        <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-gray-200"></div>

                        {/* 時間節點 */}
                        <div className="space-y-4">
                          {/* 訂單創建 */}
                          <div className="relative flex items-start ml-1">
                            <div className="absolute left-1 -translate-x-1/2 h-4 w-4 rounded-full z-10 bg-green-500"></div>
                            <div className="ml-6">
                              <h3 className="text-sm font-medium">訂單創建</h3>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}
                              </p>
                            </div>
                          </div>

                          {/* 店家接受訂單 */}
                          {(order.acceptedAt || ["accepted", "prepared", "completed"].includes(order.status)) && (
                            <div className="relative flex items-start ml-1">
                              <div className="absolute left-1 -translate-x-1/2 h-4 w-4 rounded-full z-10 bg-green-500"></div>
                              <div className="ml-6">
                                <h3 className="text-sm font-medium">店家接受訂單</h3>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(order.acceptedAt || order.updatedAt || order.createdAt),
                                    "yyyy/MM/dd HH:mm",
                                    { locale: zhTW },
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 餐點已準備完成 */}
                          {(order.preparedAt || ["prepared", "completed"].includes(order.status)) && (
                            <div className="relative flex items-start ml-1">
                              <div className="absolute left-1 -translate-x-1/2 h-4 w-4 rounded-full z-10 bg-green-500"></div>
                              <div className="ml-6">
                                <h3 className="text-sm font-medium">餐點已準備完成</h3>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(order.preparedAt || order.updatedAt || order.createdAt),
                                    "yyyy/MM/dd HH:mm",
                                    { locale: zhTW },
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 訂單完成 */}
                          {(order.completedAt || order.status === "completed") && (
                            <div className="relative flex items-start ml-1">
                              <div className="absolute left-1 -translate-x-1/2 h-4 w-4 rounded-full z-10 bg-green-500"></div>
                              <div className="ml-6">
                                <h3 className="text-sm font-medium">訂單完成</h3>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(order.completedAt || order.updatedAt || order.createdAt),
                                    "yyyy/MM/dd HH:mm",
                                    { locale: zhTW },
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 訂單取消或拒絕 */}
                          {(order.cancelledAt || ["cancelled", "rejected"].includes(order.status)) && (
                            <div className="relative flex items-start ml-1">
                              <div className="absolute left-1 -translate-x-1/2 h-4 w-4 rounded-full z-10 bg-red-500"></div>
                              <div className="ml-6">
                                <h3 className="text-sm font-medium">
                                  {order.status === "cancelled" ? "訂單已取消" : "訂單已拒絕"}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(order.cancelledAt || order.updatedAt || order.createdAt),
                                    "yyyy/MM/dd HH:mm",
                                    { locale: zhTW },
                                  )}
                                </p>
                                {order.cancelReason && (
                                  <p className="text-xs text-red-500 mt-1">原因: {order.cancelReason}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg" style={{ minHeight: "200px" }}>
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-medium mb-2">尚無訂單記錄</h2>
          <p className="text-gray-500 mb-4">您的訂單記錄將顯示在這裡</p>
        </div>
      )}
    </div>
  )
}
