"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useCart, CartItem } from "@/hooks/use-cart"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"

type Store = { id: string; name: string; storeCode?: string; description?: string }
type Food = {
  id: string
  storeId: string
  name: string
  description?: string
  image?: string
  originalPrice?: number
  discountPrice?: number
  price?: number
  quantity?: number
  isListed?: boolean
}

export default function StorePage() {
  const params = useParams<{ id: string }>()
  const storeId = String(params.id)
  const { toast } = useToast()
  const { addToCart, forceSwitchStoreAndAdd, getCart } = useCart()

  const [store, setStore] = useState<Store | null>(null)
  const [foods, setFoods] = useState<Food[]>([])
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})

  // cross-store prompt
  const [switchOpen, setSwitchOpen] = useState(false)
  const [attemptItem, setAttemptItem] = useState<CartItem | null>(null)
  const [conflictStoreId, setConflictStoreId] = useState<string>("")
  const [conflictStoreName, setConflictStoreName] = useState<string>("")
  const [attemptStoreName, setAttemptStoreName] = useState<string>("")

  const readStoreName = (id: string | null) => {
    if (!id) return ""
    try {
      const s = localStorage.getItem("registeredStores")
      if (!s) return ""
      const arr = JSON.parse(s) as Store[]
      const hit = arr.find((x) => String(x.id) === String(id))
      return hit?.name || ""
    } catch { return "" }
  }

  // 初始化：讀店家、商品；把店家資訊寫到 sessionStorage（供結帳使用）
  const loadData = () => {
    try {
      const s = localStorage.getItem("registeredStores")
      if (s) {
        const arr = JSON.parse(s) as Store[]
        const found = arr.find((x) => String(x.id) === storeId) || null
        setStore(found)
        if (found) {
          sessionStorage.setItem("currentStoreId", String(found.id))
          sessionStorage.setItem("currentStoreName", String(found.name))
        }
      }
      const f = localStorage.getItem("foodItems")
      if (f) {
        const arr = (JSON.parse(f) as Food[])
          .filter((x) =>
            String(x.storeId) === storeId &&
            (x.isListed !== false) &&
            Number(x.quantity ?? 0) > 0
          )
        setFoods(arr)
        const init: Record<string, number> = {}
        for (const it of arr) init[it.id] = 1
        setQtyMap(init)
      } else {
        setFoods([])
        setQtyMap({})
      }
    } catch (e) {
      console.error(e)
      setFoods([])
      setQtyMap({})
    }
  }

  useEffect(() => { loadData() }, [storeId])

  // 即時刷新：庫存或下架變化
  useEffect(() => {
    const h = () => loadData()
    window.addEventListener("inventoryUpdated", h as EventListener)
    return () => window.removeEventListener("inventoryUpdated", h as EventListener)
  }, [])

  // 監聽跨店加入事件 → 彈出視窗
  useEffect(() => {
    const onDiff = (e: any) => {
      const { conflictStoreId, attemptStoreId, item } = e.detail || {}
      setAttemptItem(item)
      setConflictStoreId(conflictStoreId)
      setConflictStoreName(readStoreName(conflictStoreId))
      setAttemptStoreName(readStoreName(attemptStoreId) || (store?.name ?? ""))
      setSwitchOpen(true)
    }
    window.addEventListener("cartDifferentStoreAttempt", onDiff as EventListener)
    return () => window.removeEventListener("cartDifferentStoreAttempt", onDiff as EventListener)
  }, [store?.name])

  // 顯示邏輯：有庫存的在前
  const sortedFoods = useMemo(() => {
    return [...foods].sort((a, b) => Number(b.quantity ?? 0) - Number(a.quantity ?? 0))
  }, [foods])

  const displayPrice = (it: Food) => Number(it.discountPrice ?? it.price ?? it.originalPrice ?? 0)

  // 調整數量（限制 1..庫存）
  const handleQty = (id: string, delta: number) => {
    const item = foods.find((x) => x.id === id)
    const stock = Number(item?.quantity ?? 0)
    setQtyMap((prev) => {
      const next = Math.min(stock, Math.max(1, (prev[id] ?? 1) + delta))
      return { ...prev, [id]: next }
    })
  }

  const clampQtyInput = (id: string, value: string) => {
    const n = Math.max(1, Number(value) || 1)
    const item = foods.find((x) => x.id === id)
    const stock = Number(item?.quantity ?? 0)
    setQtyMap((prev) => ({ ...prev, [id]: Math.min(stock, n) }))
  }

  // 新增到購物車（加上：不可超過庫存＝庫存數量 - 已在購物車數量）
  const handleAddToCart = (item: Food) => {
    const desired = qtyMap[item.id] ?? 1
    const stock = Number(item.quantity ?? 0)
    if (stock <= 0) {
      toast({ title: "缺貨", description: "此商品目前無庫存", variant: "destructive" })
      return
    }

    // 已在購物車的同品項數量
    const cart = getCart(storeId)
    const already = cart.find((c) => String(c.id) === String(item.id))?.quantity ?? 0
    const maxCanAdd = Math.max(0, stock - already)

    if (maxCanAdd <= 0) {
      toast({ title: "已達庫存上限", description: "此商品在購物車中的數量已達庫存上限", variant: "destructive" })
      return
    }

    const addQty = Math.min(desired, maxCanAdd)

    const ok = addToCart({
      id: String(item.id),
      name: item.name,
      price: displayPrice(item),
      quantity: addQty,
      image: item.image,
      storeId,
    } as CartItem)

    if (ok) {
      toast({ title: "已加入購物車", description: `${item.name} x${addQty}` })
    }
    // 若為跨店情況，會彈出視窗（event listener 處理）
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 店家資訊 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {store?.name ?? "店家"} {store?.storeCode ? <span className="text-muted-foreground ml-2">({store.storeCode})</span> : null}
        </h1>
        {store?.description && <p className="text-muted-foreground mt-1">{store.description}</p>}
      </div>

      {/* 商品清單 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedFoods.map((it) => (
          <Card key={String(it.id)} className="flex flex-col">
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden bg-muted">
                {it.image ? (
                  <Image src={it.image} alt={it.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                ) : null}
              </div>
              <div className="font-medium">{it.name}</div>
              {it.description && <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{it.description}</div>}
              <div className="mt-2 flex items-center justify-between">
                <div className="text-base font-semibold">NT$ {displayPrice(it)}</div>
                <div className="text-sm text-muted-foreground">庫存：{Number(it.quantity ?? 0)}</div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => handleQty(it.id, -1)}>−</Button>
                <Input
                  value={qtyMap[it.id] ?? 1}
                  onChange={(e) => clampQtyInput(it.id, e.target.value)}
                  className="w-16 text-center"
                />
                <Button type="button" variant="outline" onClick={() => handleQty(it.id, +1)}>＋</Button>
                <div className="flex-1" />
                <Button type="button" onClick={() => handleAddToCart(it)} disabled={Number(it.quantity ?? 0) <= 0}>
                  加入購物車
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {sortedFoods.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">尚無可購買商品</div>
        )}
      </div>

      {/* 跨店購物確認彈窗 */}
      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>切換店家？</DialogTitle>
            <DialogDescription>
              你的購物車目前有「{conflictStoreName || conflictStoreId || "其他店家"}」的商品。<br />
              是否清空現有購物車，改加入「{attemptStoreName || store?.name || "此店家"}」的商品？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSwitchOpen(false)}>取消</Button>
            <Button
              onClick={() => {
                if (attemptItem) {
                  forceSwitchStoreAndAdd(storeId, attemptItem)
                  setSwitchOpen(false)
                  toast({ title: "已切換店家並加入購物車", description: `${attemptItem.name} x${attemptItem.quantity}` })
                } else {
                  setSwitchOpen(false)
                }
              }}
            >
              確定切換並加入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
