"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar, Filter } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import AdminOrderDetailDialog from "@/components/admin-order-detail-dialog"
import { cn } from "@/lib/utils"
import { applyInventoryForStatusChange } from "@/lib/inventory-service"

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchField, setSearchField] = useState<"all" | "orderId" | "storeCode" | "storeName" | "customerName" | "customerPhone" | "items">("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false)

  const normalizeOrders = (raw: any[]): any[] =>
    (Array.isArray(raw) ? raw : []).map((o, i) => {
      const id = (typeof o?.id === "string" || typeof o?.id === "number")
        ? String(o.id)
        : `order-${o?.storeCode ?? o?.storeId ?? "000"}-${new Date(o?.createdAt ?? Date.now()).toISOString().slice(0,10).replace(/-/g,"")}-${String(i+1).padStart(3,"0")}`
      return { ...o, id }
    })

  const fetchLocal = () => {
    const o = localStorage.getItem("orders"); if (o) setOrders(normalizeOrders(JSON.parse(o)))
    const s = localStorage.getItem("registeredStores"); if (s) setStores(JSON.parse(s))
  }
  const fetchBackend = async () => {
    const o = await fetch("/api/orders?scope=admin", { cache: "no-store" }).then(r => r.json()).catch(() => [])
    setOrders(normalizeOrders(o?.data ?? []))
    const s = localStorage.getItem("registeredStores"); if (s) setStores(JSON.parse(s)) // 可另做 /api/stores
  }

  useEffect(() => {
    USE_BACKEND ? fetchBackend() : fetchLocal()
    const onOrder = () => (USE_BACKEND ? fetchBackend() : fetchLocal())
    const onStore = () => { const s = localStorage.getItem("registeredStores"); if (s) setStores(JSON.parse(s)) }
    window.addEventListener("orderStatusUpdated", onOrder)
    window.addEventListener("orderCreated", onOrder)
    window.addEventListener("storeRegistered", onStore)
    window.addEventListener("storeUpdated", onStore)
    const storageListener = (e: StorageEvent) => {
      if (e.key === "orders") onOrder()
      if (e.key === "registeredStores") onStore()
    }
    window.addEventListener("storage", storageListener)
    return () => {
      window.removeEventListener("orderStatusUpdated", onOrder)
      window.removeEventListener("orderCreated", onOrder)
      window.removeEventListener("storeRegistered", onStore)
      window.removeEventListener("storeUpdated", onStore)
      window.removeEventListener("storage", storageListener)
    }
  }, [])

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        const q = searchQuery.toLowerCase()
        let ok = true
        if (q) {
          switch (searchField) {
            case "orderId": ok = String(order.id).toLowerCase().includes(q); break
            case "storeCode": ok = (String(order.id).split("-")[1] || "").toLowerCase().includes(q); break
            case "storeName": ok = String(order.storeName ?? "").toLowerCase().includes(q); break
            case "customerName": ok = String(order.customerInfo?.name ?? "").toLowerCase().includes(q); break
            case "customerPhone": ok = String(order.customerInfo?.phone ?? "").includes(searchQuery); break
            case "items": ok = (order.items ?? []).some((it: any) => String(it.name ?? "").toLowerCase().includes(q)); break
            default: {
              const code = (String(order.id).split("-")[1] || "")
              ok = String(order.id).toLowerCase().includes(q)
                || String(order.storeName ?? "").toLowerCase().includes(q)
                || String(order.customerInfo?.name ?? "").toLowerCase().includes(q)
                || String(order.customerInfo?.phone ?? "").includes(searchQuery)
                || code.toLowerCase().includes(q)
                || (order.items ?? []).some((it: any) => String(it.name ?? "").toLowerCase().includes(q))
            }
          }
        }
        const s = statusFilter === "all" || order.status === statusFilter
        const st = storeFilter === "all" || String(order.storeId) === storeFilter
        const d = !dateFilter || new Date(order.createdAt).toISOString().split("T")[0] === dateFilter
        return ok && s && st && d
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, searchQuery, searchField, statusFilter, storeFilter, dateFilter])

  const handleViewOrder = (order: any) => { setSelectedOrder(order); setIsOrderDetailOpen(true) }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, reason?: string) => {
    try {
      let updatedOrder: any | null = null

      if (USE_BACKEND) {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus, reason }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        updatedOrder = data?.data ?? null
        await fetchBackend()
        // ✅ 後端模式：庫存已於同一交易處理，前端不再重做
      } else {
        const s = localStorage.getItem("orders") || "[]"
        const arr = JSON.parse(s)
        const i = arr.findIndex((o: any) => String(o.id) === String(orderId))
        if (i !== -1) {
          const now = new Date().toISOString()
          arr[i] = { ...arr[i], status: newStatus, updatedAt: now, [`${newStatus}At`]: now, ...(reason ? { statusReason: reason } : {}) }
          localStorage.setItem("orders", JSON.stringify(arr))
          setOrders(arr)
          updatedOrder = arr[i]
          // ✅ 本地模式：由前端執行庫存側效應
          await applyInventoryForStatusChange(updatedOrder, newStatus)
        }
      }

      window.dispatchEvent(new CustomEvent("orderStatusUpdated", { detail: { orderId, status: newStatus, reason } }))
      return true
    } catch (e) { console.error(e); return false }
  }

  const clearFilters = () => { setSearchQuery(""); setSearchField("all"); setStatusFilter("all"); setStoreFilter("all"); setDateFilter("") }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">訂單管理</h1>
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="訂單狀態" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀態</SelectItem>
              <SelectItem value="pending">等待確認</SelectItem>
              <SelectItem value="accepted">準備中</SelectItem>
              <SelectItem value="prepared">已準備</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
              <SelectItem value="rejected">已拒絕</SelectItem>
            </SelectContent>
          </Select>

          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="選擇店家" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部店家</SelectItem>
              {(stores ?? []).filter((s: any) => s?.storeCode)
                .sort((a: any, b: any) => String(a.storeCode).localeCompare(String(b.storeCode)))
                .map((store: any) => (
                  <SelectItem key={String(store.id)} value={String(store.id)}>
                    {store.name} ({store.storeCode})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10"
              placeholder={
                searchField === "all" ? "搜尋所有欄位..." :
                searchField === "orderId" ? "搜尋訂單編號..." :
                searchField === "storeCode" ? "搜尋店家代號..." :
                searchField === "storeName" ? "搜尋店家名稱..." :
                searchField === "customerName" ? "搜尋顧客姓名..." :
                searchField === "customerPhone" ? "搜尋顧客電話..." : "搜尋商品名稱..."
              }/>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-10" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSearchField("all")}>全部欄位</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchField("orderId")}>訂單編號</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchField("storeCode")}>店家代號</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchField("storeName")}>店家名稱</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchField("customerName")}>顧客姓名</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchField("customerPhone")}>顧客電話</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchField("items")}>商品名稱</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={clearFilters}>清除篩選</Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={String(order.id)} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="text-lg font-medium">{String(order.id)}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), "yyyy/MM/dd HH:mm", { locale: zhTW })}
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-full text-sm",
                  order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  order.status === "accepted" ? "bg-blue-100 text-blue-800" :
                  order.status === "prepared" ? "bg-green-100 text-green-800" :
                  order.status === "completed" ? "bg-green-100 text-green-800" :
                  "bg-red-100 text-red-800",
                )}>
                  {order.status === "pending" ? "等待確認" :
                   order.status === "accepted" ? "準備中" :
                   order.status === "prepared" ? "已準備" :
                   order.status === "completed" ? "已完成" :
                   order.status === "cancelled" ? "已取消" : "已拒絕"}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">店家資訊</span><span className="font-medium">{order.storeName} ({String(order.id).split("-")[1]})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">訂單金額</span><span className="font-medium">NT$ {order.total}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">商品資訊</span><span className="font-medium">{(order.items ?? []).map((it: any) => `${it.name} x${it.quantity}`).join(", ")}</span></div>
                {order.customerInfo?.name && <div className="flex justify-between"><span className="text-muted-foreground">顧客</span><span className="font-medium">{order.customerInfo.name} ({order.customerInfo.phone})</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">用戶帳號</span><span className="font-medium">{order.userId}</span></div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => handleViewOrder(order)}>查看詳情</Button>
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

      {selectedOrder && (
        <AdminOrderDetailDialog
          isOpen={isOrderDetailOpen}
          onClose={() => { setIsOrderDetailOpen(false); setSelectedOrder(null) }}
          order={selectedOrder}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      )}
    </div>
  )
}
