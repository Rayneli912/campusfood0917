// app/user/checkout/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/use-cart"
import { formatInTimeZone } from "date-fns-tz"
// (A) 建立訂單後廣播，讓店家端即時更新
import { notifyDataUpdate, ORDER_DATA_UPDATED } from "@/lib/sync-service"

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true"

type Store = { id: string; name: string; storeCode?: string }
type CartItem = { id: string; name: string; price: number; quantity: number; image?: string; storeId: string }

type OrderPayload = {
  storeId: string
  items: { id: string; name: string; price: number; quantity: number }[]
  total: number
  customerInfo: { name?: string; phone?: string; email?: string }
  note?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { getCart, clear } = useCart()

  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string>("")
  const [items, setItems] = useState<CartItem[]>([])

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    const sid = sessionStorage.getItem("currentStoreId")
    let sname = sessionStorage.getItem("currentStoreName") || ""
    if (sid && !sname) {
      const rs = localStorage.getItem("registeredStores")
      if (rs) {
        try {
          const arr = JSON.parse(rs) as Store[]
          const hit = arr.find((x) => String(x.id) === String(sid))
          if (hit?.name) sname = String(hit.name)
        } catch {}
      }
    }
    setStoreId(sid)
    setStoreName(sname)
    setItems(sid ? (getCart(sid) as any) : [])
  }, [getCart])

  // 自動帶入使用者資料
  useEffect(() => {
    try {
      const uraw = localStorage.getItem("user"); if (!uraw) return
      const u = JSON.parse(uraw); const p = u?.profile ?? u
      setName(p?.name || p?.fullName || p?.nickname || "")
      setPhone(p?.phone || p?.mobile || "")
      setEmail(p?.email || "")
    } catch {}
  }, [])

  const total = useMemo(
    () => items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0),
    [items]
  )

  function readStoreCode(sid: string): string {
    let code = ""
    try {
      const rs = localStorage.getItem("registeredStores")
      if (rs) {
        const arr = JSON.parse(rs) as Store[]
        const hit = arr.find((x) => String(x.id) === String(sid))
        code = hit?.storeCode || ""
      }
    } catch {}
    if (!code) {
      const m = /^store(\d+)$/.exec(String(sid))
      if (m) code = String(parseInt(m[1], 10)).padStart(3, "0")
    }
    return code || "000"
  }

  function nextLocalOrderId(sid: string): string {
    const storeCode = readStoreCode(sid)
    const dateStr = formatInTimeZone(new Date(), "Asia/Taipei", "yyyyMMdd")
    const seqKey = `orderSeq:${sid}:${dateStr}`
    const cur = Number(localStorage.getItem(seqKey) || "0") + 1
    localStorage.setItem(seqKey, String(cur))
    const seq = String(cur).padStart(3, "0")
    return `order-${storeCode}-${dateStr}-${seq}`
  }

  async function createOrderLocal(payload: OrderPayload) {
    const id = nextLocalOrderId(payload.storeId)
    const createdAt = new Date().toISOString()
    const newOrder = {
      id,
      userId: (JSON.parse(localStorage.getItem("user") || "{}")?.id) ?? "guest",
      storeId: payload.storeId,
      storeName,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
      items: payload.items.map((i) => ({
        id: i.id, name: i.name, price: i.price, quantity: i.quantity,
        foodItemId: i.id,
      })),
      total: payload.total,
      customerInfo: payload.customerInfo,
      // (C) 備註去除純空白，無內容則不寫入
      note: (payload.note ?? "").toString().trim() || undefined,
    }
    const raw = localStorage.getItem("orders")
    const arr = raw ? JSON.parse(raw) : []
    const list = Array.isArray(arr) ? arr : []
    // (B) 與店家/後台一致，最新放最上
    list.unshift(newOrder)
    localStorage.setItem("orders", JSON.stringify(list))

    // (A) 廣播全域同步事件，讓店家端立即看到新訂單
    notifyDataUpdate(ORDER_DATA_UPDATED, { orderId: id, order: newOrder })

    // 仍保留舊事件（相容你的其他監聽）
    window.dispatchEvent(new CustomEvent("orderCreated", { detail: { orderId: id } }))
    return id
  }

  async function createOrder(payload: OrderPayload) {
    // ✅ 强制使用数据库 API
    const userId = JSON.parse(localStorage.getItem("user") || "{}")?.id
    if (!userId) {
      throw new Error("请先登录")
    }

    console.log("创建订单，payload:", {
      ...payload,
      userId,
    })

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        userId,
      }),
    })
    
    const json = await res.json()
    console.log("订单 API 响应:", json)
    
    if (!res.ok || !json.success) {
      console.error("创建订单失败，响应:", json)
      throw new Error(json.message || "创建订单失败")
    }
    
    return json.order.id as string
  }

  const handleSubmit = async () => {
    try {
      if (!storeId || items.length === 0) return
      const payload: OrderPayload = {
        storeId,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        total,
        customerInfo: { name, phone, email },
        note, // 已在 createOrderLocal 內做 trim
      }
      const orderId = await createOrder(payload)
      // 清空購物車 + 解除綁定
      clear()
      sessionStorage.removeItem("currentStoreId")
      sessionStorage.removeItem("currentStoreName")
      // 導向訂單詳情（＝追蹤）
      router.push(`/user/order-tracking?id=${encodeURIComponent(orderId)}`)
    } catch (e: any) {
      console.error(e)
      toast({ title: "建立訂單失敗", description: String(e?.message || "請稍後再試"), variant: "destructive" })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">結帳</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：表單 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">店家</div>
                <Input value={storeName} disabled />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">姓名</div>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="請輸入姓名" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">電話</div>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="請輸入電話" />
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Email（選填）</div>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">備註（選填）</div>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="想說的話..." />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右：摘要 */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="text-sm text-muted-foreground">購物車</div>
              <div className="space-y-1 text-sm">
                {items.map((it) => (
                  <div key={String(it.id)} className="flex justify-between">
                    <span>{it.name} x{it.quantity}</span>
                    <span>NT$ {Number(it.price) * Number(it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between font-medium">
                <span>總計</span>
                <span>NT$ {total}</span>
              </div>
              <Button className="w-full mt-2" onClick={handleSubmit}>送出訂單</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
