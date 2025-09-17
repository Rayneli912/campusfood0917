"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useCart, CartItem } from "@/hooks/use-cart"
import { useFavorites } from "@/hooks/use-favorites"
import { useRecentViews } from "@/hooks/use-recent-views"
import { Heart } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type Store = { id: string; name: string; storeCode?: string; description?: string; address?: string; location?: string; image?: string; coverImage?: string }
type Food = {
  id: string
  storeId: string
  name: string
  description?: string
  image?: string
  price?: number
  originalPrice?: number
  discountPrice?: number
  isListed?: boolean
  quantity?: number
  category?: string
  isPopular?: boolean
}

export default function StorePage() {
  const params = useParams()
  const storeId = String(params.id)
  const { toast } = useToast()
  const { addToCart, getCart, forceSwitchStoreAndAdd } = useCart()
  const { isFavorite, toggle: toggleFavorite } = useFavorites()
  const { add: addRecentView } = useRecentViews()

  const [store, setStore] = useState<Store | null>(null)
  const [foods, setFoods] = useState<Food[]>([])
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})

  const [switchOpen, setSwitchOpen] = useState(false)
  const [attemptItem, setAttemptItem] = useState<CartItem | null>(null)
  const [conflictStoreId, setConflictStoreId] = useState<string | null>(null)
  const [conflictStoreName, setConflictStoreName] = useState<string>("")
  const [attemptStoreName, setAttemptStoreName] = useState<string>("")

  // 只記錄一次近期瀏覽（避免 Strict Mode 造成的雙呼叫）
  const viewedOnceRef = useRef(false)

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

  // 載入店家資訊 + 記錄近期瀏覽（僅一次）
  useEffect(() => {
    try {
      // 嘗試從多個來源載店家
      const s1 = localStorage.getItem("registeredStores")
      if (s1) {
        const arr = JSON.parse(s1) as Store[]
        const found = arr.find((x) => String(x.id) === storeId) || null
        if (found) {
          setStore(found)
          if (!viewedOnceRef.current) {
            addRecentView(found)
            viewedOnceRef.current = true
          }
        }
      }
      const s2 = localStorage.getItem(`store_${storeId}`)
      if (!store && s2) {
        const found = JSON.parse(s2) as Store
        setStore(found)
        if (!viewedOnceRef.current) {
          addRecentView(found)
          viewedOnceRef.current = true
        }
      }
      if (store) {
        sessionStorage.setItem("currentStoreId", String(store.id))
        sessionStorage.setItem("currentStoreName", String(store.name))
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, addRecentView])

  // 讀取商品
  const loadFoods = () => {
    try {
      const raw = localStorage.getItem(`foodItems_${storeId}`)
      const arr = raw ? JSON.parse(raw) : []
      const list = (Array.isArray(arr) ? arr : []).filter((x: any) => x.isListed !== false && Number(x.quantity) >= 0)
      setFoods(list)

      const q: Record<string, number> = {}
      list.forEach((it: Food) => {
        const initial = Math.min(1, Number(it.quantity ?? 0)) || 1
        q[it.id] = initial
      })
      setQtyMap(q)
    } catch {
      setFoods([])
    }
  }

  useEffect(() => {
    loadFoods()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // 監聽跨店加入事件 → 彈出切換對話框
  useEffect(() => {
    const onDiff = (ev: any) => {
      const { conflictStoreId, attemptStoreId, item } = ev?.detail || {}
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

  const displayPrice = (it: Food) =>
    Number(it.discountPrice ?? it.price ?? it.originalPrice ?? 0)

  const handleQty = (id: string, delta: number) => {
    const item = foods.find((x) => x.id === id)
    const stock = Number(item?.quantity ?? 0)
    setQtyMap((prev) => {
      const next = Math.min(stock, Math.max(1, (prev[id] ?? 1) + delta))
      if (next === prev[id]) return prev
      return { ...prev, [id]: next }
    })
  }

  const clampQtyInput = (id: string, value: string) => {
    const n = Math.max(1, Number(value) || 1)
    const item = foods.find((x) => x.id === id)
    const stock = Number(item?.quantity ?? 0)
    const next = Math.min(stock, n)
    setQtyMap((prev) => (prev[id] === next ? prev : { ...prev, [id]: next }))
  }

  const handleAdd = (it: Food) => {
    const desired = qtyMap[it.id] ?? 1
    const stock = Number(it.quantity ?? 0)
    const cart = getCart(storeId)
    const already = cart.find((c) => String(c.id) === String(it.id))?.quantity ?? 0
    const canAdd = Math.max(0, stock - already)
    if (canAdd <= 0) {
      toast({ title: "已達庫存上限", variant: "destructive" })
      return
    }
    const qty = Math.min(desired, canAdd)
    addToCart({ id: it.id, name: it.name, price: displayPrice(it), quantity: qty, image: it.image, storeId })

    // 設定 sessionStorage 供購物車頁面使用
    sessionStorage.setItem("currentStoreId", storeId)
    if (store?.name) {
      sessionStorage.setItem("currentStoreName", store.name)
    }

    toast({ title: "已加入購物車", description: `${it.name} ×${qty}` })
  }

  const toggleFav = async () => {
    if (!store) return
    await toggleFavorite({
      id: store.id,
      name: store.name,
      image: store.coverImage || store.image,
      address: store.address,
    })
  }

  return (
    <div className="container py-6">
      {/* 店家抬頭 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
          {store?.image ? <Image src={store.image} alt={store.name} fill className="object-cover" /> : null}
        </div>
        <div className="min-w-0">
          <div className="text-xl font-semibold truncate">{store?.name ?? "店家"}</div>
          {store?.address ? <div className="text-sm text-muted-foreground truncate">{store.address}</div> : null}
        </div>
        <div className="flex-1" />
        <Button variant={isFavorite(store?.id ?? "") ? "default" : "outline"} size="sm" onClick={toggleFav}>
          <Heart className="h-4 w-4 mr-1" /> {isFavorite(store?.id ?? "") ? "已收藏" : "收藏"}
        </Button>
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
                <Button type="button" onClick={() => handleAdd(it)} disabled={Number(it.quantity ?? 0) <= 0}>
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

      {/* 跨店切換對話框 */}
      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>切換店家？</DialogTitle>
            <DialogDescription>
              目前購物車內包含 {conflictStoreName || "其他店家"} 的商品。是否清空購物車，改加入「{attemptStoreName || "新店家"}」的商品？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwitchOpen(false)}>取消</Button>
            <Button
              onClick={() => {
                if (attemptItem) {
                  forceSwitchStoreAndAdd(String(attemptItem.storeId), attemptItem)
                  sessionStorage.setItem("currentStoreId", String(attemptItem.storeId))
                  if (attemptStoreName) sessionStorage.setItem("currentStoreName", attemptStoreName)
                }
                setSwitchOpen(false)
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
