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
import { Heart, ShoppingCart, Minus, Plus, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import Link from "next/link"

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
  expiryTime?: string
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
  const [loading, setLoading] = useState(true)

  const [switchOpen, setSwitchOpen] = useState(false)
  const [attemptItem, setAttemptItem] = useState<CartItem | null>(null)
  const [conflictStoreId, setConflictStoreId] = useState<string | null>(null)
  const [conflictStoreName, setConflictStoreName] = useState<string>("")
  const [attemptStoreName, setAttemptStoreName] = useState<string>("")

  const viewedOnceRef = useRef(false)

  // ✅ 从数据库获取店家名称
  const fetchStoreName = async (storeId: string | null): Promise<string> => {
    if (!storeId) return ""
    try {
      const res = await fetch(`/api/user/stores?storeId=${storeId}`)
      if (res.ok) {
        const json = await res.json()
        return json.restaurant?.name || ""
      }
      return ""
    } catch {
      return ""
    }
  }

  // ✅ 從資料庫 API 載入店家資訊和商品
  useEffect(() => {
    let mounted = true
    
    const loadStoreAndProducts = async () => {
      try {
        setLoading(true)
        
        // 1. 載入店家資訊
        const storeResponse = await fetch(`/api/user/stores?storeId=${storeId}`)
        const storeData = await storeResponse.json()
        
        if (!mounted) return
        
        if (storeData.success && storeData.restaurant) {
          const storeInfo: Store = {
            id: storeData.restaurant.id,
            name: storeData.restaurant.name,
            storeCode: storeData.restaurant.storeCode,
            description: storeData.restaurant.description,
            address: storeData.restaurant.address || storeData.restaurant.location,
            location: storeData.restaurant.location,
            image: storeData.restaurant.coverImage,
            coverImage: storeData.restaurant.coverImage,
          }
          setStore(storeInfo)
          
          // 記錄近期瀏覽（僅一次）
          if (!viewedOnceRef.current) {
            addRecentView(storeInfo)
            viewedOnceRef.current = true
          }
          
          // 設置 session
          sessionStorage.setItem("currentStoreId", storeInfo.id)
          sessionStorage.setItem("currentStoreName", storeInfo.name)
        }

        // 2. 載入商品
        const productsResponse = await fetch(`/api/user/products?storeId=${storeId}`)
        const productsData = await productsResponse.json()
        
        if (!mounted) return
        
        if (productsData.success && Array.isArray(productsData.products)) {
          const mappedFoods: Food[] = productsData.products.map((p: any) => ({
            id: p.id,
            storeId: p.storeId || storeId,
            name: p.name,
            description: p.description,
            image: p.image,
            price: p.price || p.discountPrice,
            originalPrice: p.originalPrice,
            discountPrice: p.discountPrice,
            isListed: p.isListed,
            quantity: p.quantity,
            category: p.category,
            isPopular: p.isPopular,
            expiryTime: p.expiryTime,
          }))
          setFoods(mappedFoods)
          
          // 初始化數量選擇器
          const q: Record<string, number> = {}
          mappedFoods.forEach((f) => {
            q[f.id] = 1
          })
          setQtyMap(q)
        }
      } catch (error) {
        console.error("載入店家或商品失敗:", error)
        toast({
          title: "載入失敗",
          description: "無法載入店家資料，請重試",
          variant: "destructive",
        })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    loadStoreAndProducts()
    
    return () => {
      mounted = false
    }
  }, [storeId, addRecentView, toast])

  // 監聽跨店加入購物車
  useEffect(() => {
    const onDiff = async (ev: any) => {
      const { conflictStoreId, attemptStoreId, item } = ev?.detail || {}
      setAttemptItem(item)
      setConflictStoreId(conflictStoreId)
      
      // ✅ 从数据库获取店家名称
      try {
        const conflictName = await fetchStoreName(conflictStoreId)
        const attemptName = attemptStoreId === storeId 
          ? (store?.name ?? "") 
          : await fetchStoreName(attemptStoreId)
        
        setConflictStoreName(conflictName)
        setAttemptStoreName(attemptName)
      } catch (e) {
        console.error("获取店家名称错误:", e)
        setConflictStoreName("")
        setAttemptStoreName(store?.name ?? "")
      }
      
      setSwitchOpen(true)
    }
    window.addEventListener("cartDifferentStoreAttempt", onDiff as EventListener)
    return () => window.removeEventListener("cartDifferentStoreAttempt", onDiff as EventListener)
  }, [store?.name, storeId])

  const handleAddToCart = (food: Food) => {
    const qty = qtyMap[food.id] || 1
    const item: CartItem = {
      id: food.id,
      name: food.name,
      price: food.discountPrice || food.price || 0,
      quantity: qty,
      storeId: food.storeId || storeId,
      storeName: store?.name || "",
      image: food.image,
      maxQuantity: food.quantity || 999,
    }
    addToCart(item)
    toast({
      title: "商品已加入購物車！",
      description: `${food.name} x${qty}`,
    })
  }

  const handleSwitchStore = () => {
    if (attemptItem) {
      forceSwitchStoreAndAdd(attemptItem)
      setSwitchOpen(false)
      setAttemptItem(null)
    }
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    foods.forEach((f) => {
      if (f.category) set.add(f.category)
    })
    return Array.from(set)
  }, [foods])

  const fav = store ? isFavorite(store.id) : false

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">找不到店家</p>
          <Link href="/user/home">
            <Button className="mt-4">返回首頁</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 店家資訊 */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between mb-4">
            <Link href="/user/home">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => store && toggleFavorite({
                id: store.id,
                name: store.name,
                type: "store",
                description: store.description,
                location: store.location,
                image: store.coverImage
              })}
            >
              <Heart className={`h-5 w-5 ${fav ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
          </div>
          
          {store.coverImage && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
              <Image
                src={store.coverImage}
                alt={store.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          
          <h1 className="text-2xl font-bold mb-2">{store.name}</h1>
          {store.description && (
            <p className="text-gray-600 mb-2">{store.description}</p>
          )}
          {store.location && (
            <p className="text-sm text-gray-500">{store.location}</p>
          )}
        </div>
      </div>

      {/* 商品列表 */}
      <div className="container mx-auto px-4 py-6">
        {foods.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">目前沒有可購買的商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {foods.map((food) => (
              <Card key={food.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {food.image && (
                    <div className="relative w-full h-48">
                      <Image
                        src={food.image}
                        alt={food.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{food.name}</h3>
                    {food.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{food.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {food.originalPrice && food.originalPrice > (food.discountPrice || 0) && (
                          <span className="text-sm text-gray-400 line-through mr-2">
                            ${food.originalPrice}
                          </span>
                        )}
                        <span className="text-lg font-bold text-green-600">
                          ${food.discountPrice || food.price}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        庫存: {food.quantity}
                      </span>
                    </div>
                    {food.expiryTime && (
                      <p className="text-xs text-orange-600 mb-2">
                        到期時間: {new Date(food.expiryTime).toLocaleString("zh-TW")}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQtyMap((prev) => ({ ...prev, [food.id]: Math.max(1, (prev[food.id] || 1) - 1) }))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={food.quantity}
                          value={qtyMap[food.id] || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1
                            setQtyMap((prev) => ({ ...prev, [food.id]: Math.min(Math.max(1, val), food.quantity || 999) }))
                          }}
                          className="w-16 text-center border-none"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQtyMap((prev) => ({ ...prev, [food.id]: Math.min((prev[food.id] || 1) + 1, food.quantity || 999) }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        className="flex-1"
                        onClick={() => handleAddToCart(food)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        加入購物車
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 跨店切換對話框 */}
      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更換店家？</DialogTitle>
            <DialogDescription>
              您的購物車中有來自「{conflictStoreName}」的商品，
              如果加入「{attemptStoreName}」的商品，將會清空目前購物車。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwitchOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSwitchStore}>
              確定切換
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
