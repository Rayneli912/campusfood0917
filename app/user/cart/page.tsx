"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useCart, CartItem } from "@/hooks/use-cart"
import { cn } from "@/lib/utils"
import ActiveOrderTracking from "@/components/active-order-tracking"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getInventory } from "@/lib/inventory-service"

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true"

type Store = { id: string; name: string }
type OrderItem = { id?: string; foodItemId?: string; name: string; price: number; quantity: number }
type Order = {
  id: string
  userId: string
  storeId: string
  storeName?: string
  status: "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected"
  createdAt: string
  total: number
  items: OrderItem[]
}

export default function CartPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { items: allItems, getCart, addToCart, updateQuantity, remove, clear, count, total: cartTotal } = useCart()

  const [user, setUser] = useState<any | null>(null)
  const [stockData, setStockData] = useState<Record<string, number>>({})
  
  useEffect(() => { try { const u = localStorage.getItem("user"); if (u) setUser(JSON.parse(u)) } catch {} }, [])

  // 監聽庫存變化
  useEffect(() => {
    const handleInventoryUpdate = (e: CustomEvent) => {
      const { storeId, items } = e.detail
      if (storeId && items) {
        const newStockData: Record<string, number> = {}
        items.forEach((item: any) => {
          newStockData[`${storeId}_${item.id}`] = item.quantity || 0
        })
        setStockData(prev => ({ ...prev, ...newStockData }))
      }
    }
    
    window.addEventListener("inventoryUpdated" as any, handleInventoryUpdate)
    return () => window.removeEventListener("inventoryUpdated" as any, handleInventoryUpdate)
  }, [])

  // 上半：購物車 - 直接使用 useCart 的資料
  const items = allItems // 直接使用所有購物車商品
  const currentStoreId = items.length > 0 ? items[0].storeId : null

  // 下半：訂單紀錄
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // 詳情 Dialog
  const [openDetail, setOpenDetail] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // 使用 cartTotal 或自己計算
  const total = cartTotal

  // 獲取商品庫存數量（優先使用即時資料）
  const getItemStock = (itemId: string, storeId: string): number => {
    try {
      // 優先使用即時庫存資料
      const stockKey = `${storeId}_${itemId}`
      if (stockData[stockKey] !== undefined) {
        return stockData[stockKey]
      }
      
      // 備用：從 localStorage 獲取庫存資料
      const inventoryKey = `foodItems_${storeId}`
      const inventory = JSON.parse(localStorage.getItem(inventoryKey) || "[]")
      const item = inventory.find((i: any) => String(i.id) === String(itemId))
      return item?.quantity || 0
    } catch {
      return 0
    }
  }

  const inc = (id: string) => { 
    const it = items.find((x) => x.id === id); 
    if (!it) return;
    // 檢查庫存限制
    const maxQuantity = getItemStock(it.id, it.storeId);
    if (it.quantity >= maxQuantity) {
      toast({ title: "已達庫存上限", description: "無法再增加更多數量", variant: "destructive" });
      return;
    }
    updateQuantity(id, it.quantity + 1); 
  }
  const dec = (id: string) => { 
    const it = items.find((x) => x.id === id); 
    if (!it) return;
    if (it.quantity <= 1) {
      remove(id);
    } else {
      updateQuantity(id, it.quantity - 1);
    }
  }
  const removeItem = (id: string) => remove(id)
  const clearCart = () => clear()

  const goCheckout = () => {
    if (!currentStoreId || items.length === 0) {
      toast({ title: "購物車為空", description: "請先加入商品再結帳", variant: "destructive" })
      return
    }
    // 設定 sessionStorage 供結帳頁面使用
    if (currentStoreId) {
      sessionStorage.setItem("currentStoreId", currentStoreId)
    }
    router.push("/user/checkout")
  }

  // 訂單紀錄
  const loadOrders = async () => {
    try {
      setLoadingOrders(true)
      let list: Order[] = []
      if (USE_BACKEND) {
        if (!user?.id) { setOrders([]); return }
        const res = await fetch("/api/orders?scope=self", { headers: { "x-user-id": String(user.id) }, cache: "no-store" })
        const json = await res.json()
        list = (json?.data ?? []) as Order[]
      } else {
        const raw = localStorage.getItem("orders")
        const arr = raw ? JSON.parse(raw) : []
        list = (Array.isArray(arr) ? arr : []).filter((o: any) => String(o.userId) === String(user?.id))
      }
      list = (list ?? []).map((o: any) => ({
        ...o,
        id: String(o.id),
        items: Array.isArray(o.items) ? o.items : [],
        total: Number(o.total ?? 0),
        createdAt: o.createdAt ?? new Date().toISOString(),
      }))
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setOrders(list)
    } catch (e) {
      console.error(e); setOrders([])
    } finally { setLoadingOrders(false) }
  }
  useEffect(() => { loadOrders() }, [user?.id])
  useEffect(() => {
    const refresh = () => loadOrders()
    window.addEventListener("orderCreated", refresh as EventListener)
    window.addEventListener("orderStatusUpdated", refresh as EventListener)
    return () => {
      window.removeEventListener("orderCreated", refresh as EventListener)
      window.removeEventListener("orderStatusUpdated", refresh as EventListener)
    }
  }, [user?.id])

  const badge = (s: Order["status"]) =>
    cn(
      "px-2 py-0.5 rounded-full text-xs",
      s === "pending"   ? "bg-yellow-100 text-yellow-800" :
      s === "accepted"  ? "bg-blue-100 text-blue-800"   :
      s === "prepared"  ? "bg-green-100 text-green-800" :
      s === "completed" ? "bg-green-100 text-green-800" :
      s === "cancelled" ? "bg-red-100 text-red-800"     :
                          "bg-red-100 text-red-800"
    )

  const storeNameForItems = useMemo(() => {
    if (!currentStoreId) return ""
    try {
      // 先從註冊店家中查找
      const rs = localStorage.getItem("registeredStores")
      if (rs) {
        const arr = JSON.parse(rs) as Store[]
        const found = arr.find((x) => String(x.id) === String(currentStoreId))
        if (found?.name) return found.name
      }
      
      // 如果沒找到，嘗試從預設店家資料中查找
      import("@/lib/data").then(({ stores }) => {
        const defaultStore = stores.find((x) => String(x.id) === String(currentStoreId))
        return defaultStore?.name || ""
      }).catch(() => "")
      
      return ""
    } catch { return "" }
  }, [currentStoreId])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 上半：購物車 */}
      <h1 className="text-2xl font-bold mb-6">購物車</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：明細 */}
        <div className="lg:col-span-2 space-y-3">
          {items.length > 0 ? items.map((it) => (
            <Card key={String(it.id)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    {it.image ? <Image src={it.image} alt={it.name} fill sizes="80px" className="object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{it.name}</div>
                    {storeNameForItems && <div className="text-xs text-muted-foreground mt-0.5">餐廳：{storeNameForItems}</div>}
                    <div className="text-sm text-muted-foreground mt-1">NT$ {Number(it.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => dec(it.id)}>−</Button>
                    <Input
                      className="w-16 text-center"
                      value={it.quantity}
                      onChange={(e) => {
                        const n = Math.max(1, Number(e.target.value) || 1)
                        const maxQuantity = getItemStock(it.id, it.storeId)
                        const finalQuantity = Math.min(n, maxQuantity)
                        if (finalQuantity !== it.quantity) {
                          updateQuantity(it.id, finalQuantity)
                        }
                        if (n > maxQuantity) {
                          toast({ title: "已達庫存上限", description: `最多只能購買 ${maxQuantity} 個`, variant: "destructive" })
                        }
                      }}
                    />
                    <Button variant="outline" onClick={() => inc(it.id)}>＋</Button>
                  </div>
                  <div className="w-28 text-right font-medium">NT$ {Number(it.price) * Number(it.quantity)}</div>
                  <Button variant="ghost" onClick={() => removeItem(it.id)}>移除</Button>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">購物車是空的，去逛逛吧！</CardContent></Card>
          )}
        </div>

        {/* 右：結帳 */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between"><span>商品數量</span><span>{count}</span></div>
              <div className="flex justify-between"><span>小計</span><span>NT$ {total}</span></div>
              <div className="border-t pt-3 flex gap-2">
                <Button className="flex-1" onClick={goCheckout} disabled={!currentStoreId || items.length === 0}>前往結帳</Button>
                <Button variant="outline" className="flex-1" onClick={clearCart} disabled={!currentStoreId || items.length === 0}>清空購物車</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 下半：訂單紀錄 */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">訂單紀錄</h2>

        {loadingOrders ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">載入中…</CardContent></Card>
        ) : orders.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">尚無訂單紀錄</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <div className="font-medium">{o.id}</div>
                      <div className="text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={badge(o.status)}>
                        {o.status === "pending" ? "等待確認" :
                         o.status === "accepted" ? "準備中" :
                         o.status === "prepared" ? "已準備" :
                         o.status === "completed" ? "已完成" :
                         o.status === "cancelled" ? "已取消" : "已拒絕"}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setDetailId(o.id); setOpenDetail(true) }}>
                        查看詳情
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">店家</div>
                      <div className="font-medium">{o.storeName || o.storeId}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">金額</div>
                      <div className="font-medium">NT$ {Number(o.total)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">商品</div>
                      <div className="font-medium line-clamp-2">
                        {(o.items ?? []).map((it) => `${it.name} x${it.quantity}`).join("，")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 訂單詳情懸浮視窗（可滾動） */}
      <Dialog open={openDetail} onOpenChange={(v) => { if (!v) setOpenDetail(false) }}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>訂單詳情</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: "calc(85vh - 4rem)" }}>
            {detailId ? <ActiveOrderTracking orderId={detailId} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
