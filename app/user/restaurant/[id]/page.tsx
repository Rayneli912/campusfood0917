"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { getRestaurantById } from "@/lib/data" // ✅ 改用 API
import { getFoodItemsPublicByStoreId } from "@/lib/food-item-service"
import { useToast } from "@/components/ui/use-toast"
import { useFavorites } from "@/hooks/use-favorites"
import { useRecentViews } from "@/hooks/use-recent-views"
import { MenuItemCard } from "@/components/menu-item-card"
import { DishRecommender } from "@/components/dish-recommender"
import { getRestaurantCover, getMenuItemImage } from "@/utils/image-utils"
import { useCart, CartItem } from "@/hooks/use-cart"
import { stripStoreCode } from "@/lib/store-utils"   // 改成引用共用工具
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

// 將路由參數轉為 storeId（支援 "001" 或 "store1"）
const toStoreId = (v: string) => {
  const s = String(v || "")
  if (/^store\d+$/.test(s)) return s
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) && n > 0 ? `store${n}` : s
}

export default function RestaurantPage() {
  const params = useParams()
  const { toast } = useToast()
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites()
  const { addRecentView } = useRecentViews()
  const [restaurant, setRestaurant] = useState<any>(null)
  const [menu, setMenu] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const { addToCart, getCart, forceSwitchStoreAndAdd, count } = useCart()
  const [cartItems, setCartItems] = useState<{ [itemId: string]: number }>({})

  const readStoreName = (id: string | null) => {
    if (!id) return ""
    try {
      const s = localStorage.getItem("registeredStores")
      if (!s) return ""
      const arr = JSON.parse(s) as Array<{id:string; name:string}>
      const hit = arr.find(x => String(x.id) === String(id))
      return hit?.name || ""
    } catch { return "" }
  }

  const [switchOpen, setSwitchOpen] = useState(false)
  const [attemptItem, setAttemptItem] = useState<CartItem | null>(null)
  const [conflictStoreId, setConflictStoreId] = useState<string | null>(null)
  const [conflictStoreName, setConflictStoreName] = useState<string>("")
  const [attemptStoreName, setAttemptStoreName] = useState<string>("")

  // 監聽：跨店加入 → 彈窗確認
  useEffect(() => {
    const onDiff = (ev: any) => {
      const { conflictStoreId, attemptStoreId, item } = ev?.detail || {}
      setAttemptItem(item)
      setConflictStoreId(conflictStoreId)
      setConflictStoreName(readStoreName(conflictStoreId))
      setAttemptStoreName(readStoreName(attemptStoreId) || (restaurant?.name ?? ""))
      setSwitchOpen(true)
    }
    window.addEventListener("cartDifferentStoreAttempt", onDiff as EventListener)
    return () => window.removeEventListener("cartDifferentStoreAttempt", onDiff as EventListener)
  }, [restaurant?.name])

  // 載入店家與「已上架且庫存>0」的商品；並監聽同步事件
  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const storeId = toStoreId(params.id as string)
        
        // ✅ 從資料庫 API 獲取店家資訊
        try {
          const storeResponse = await fetch(`/api/user/stores?storeId=${storeId}`)
          const storeData = await storeResponse.json()
          if (!mounted) return
          
          if (storeData.success && storeData.restaurant) {
            setRestaurant(storeData.restaurant)
            addRecentView(storeData.restaurant)
          }
        } catch (error) {
          console.error("Failed to load store from API:", error)
        }

        // ✅ 從資料庫 API 獲取商品（而不是 localStorage）
        try {
          const response = await fetch(`/api/user/products?storeId=${storeId}`)
          const data = await response.json()
          if (!mounted) return
          
          if (data.success && Array.isArray(data.products)) {
            setMenu(data.products.map((i: any) => ({
              ...i,
              price: i.discountPrice ?? i.originalPrice ?? i.price ?? 0,
            })))
          } else {
            // 如果 API 失敗，嘗試使用舊方法作為後備
            const list = await getFoodItemsPublicByStoreId(storeId)
            setMenu((Array.isArray(list) ? list : []).map((i: any) => ({
              ...i,
              price: i.discountPrice ?? i.originalPrice ?? i.price ?? 0,
            })))
          }
        } catch (error) {
          console.error("Failed to load products from API, trying fallback:", error)
          // 後備方案：使用舊的 localStorage 方法
          const list = await getFoodItemsPublicByStoreId(storeId)
          if (!mounted) return
          setMenu((Array.isArray(list) ? list : []).map((i: any) => ({
            ...i,
            price: i.discountPrice ?? i.originalPrice ?? i.price ?? 0,
          })))
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    // 店家端上下架/庫存變動 → 用戶端自動刷新
    const onSync = async (ev: any) => {
      const sid = ev?.detail?.storeId
      const myId = toStoreId(params.id as string)
      if (sid && sid !== myId) return
      
      // ✅ 從資料庫刷新
      try {
        const response = await fetch(`/api/user/products?storeId=${myId}`)
        const data = await response.json()
        if (data.success && Array.isArray(data.products)) {
          setMenu(data.products.map((i: any) => ({
            ...i,
            price: i.discountPrice ?? i.originalPrice ?? i.price ?? 0,
          })))
          return
        }
      } catch (error) {
        console.error("Failed to sync products:", error)
      }
      
      // 後備
      const list = await getFoodItemsPublicByStoreId(myId)
      setMenu((Array.isArray(list) ? list : []).map((i: any) => ({
        ...i,
        price: i.discountPrice ?? i.originalPrice ?? i.price ?? 0,
      })))
    }

    window.addEventListener("inventoryUpdated", onSync as EventListener)
    window.addEventListener("foodItemsUpdated", onSync as EventListener)

    return () => {
      mounted = false
      window.removeEventListener("inventoryUpdated", onSync as EventListener)
      window.removeEventListener("foodItemsUpdated", onSync as EventListener)
    }
  }, [params.id, addRecentView])

  const handleToggleFavorite = () => {
    if (!restaurant) return

    if (isFavorite(restaurant.id)) {
      removeFavorite(restaurant.id)
      toast({
        title: "已從最愛移除",
        description: `${stripStoreCode(restaurant.name)} 已從您的最愛清單中移除`,
        variant: "default",
      })
    } else {
      addFavorite(restaurant)
      toast({
        title: "已加入最愛",
        description: `${stripStoreCode(restaurant.name)} 已加入您的最愛清單`,
        variant: "default",
      })
    }
  }

  // 新的加入購物車處理：由 MenuItemCard 傳入 (item, quantity)
  const handleAddToCart = (item: any, desiredQty: number) => {
    if (!item || !restaurant) return
    const storeId = toStoreId(params.id as string)
    const stock = Number(item.quantity ?? 0)
    const cart = getCart(storeId)
    const already = cart.find((c) => String(c.id) === String(item.id))?.quantity ?? 0
    const canAdd = Math.max(0, stock - already)
    if (canAdd <= 0) {
      toast({ title: "已達庫存上限", variant: "destructive" })
      return
    }
    const qty = Math.min(desiredQty || 1, canAdd)
    addToCart({
      id: item.id,
      name: item.name,
      price: Number(item.price ?? item.discountPrice ?? item.originalPrice ?? 0),
      quantity: qty,
      image: item.image,
      storeId
    })
    sessionStorage.setItem("currentStoreId", storeId)
    if (restaurant?.name) sessionStorage.setItem("currentStoreName", stripStoreCode(restaurant.name))
    toast({ title: "已加入購物車", description: `${item.name} ×${qty}` })
  }

  // 類別過濾（menu 已是可售清單）
  const filteredMenu = activeCategory === "all" ? menu : menu.filter((item) => item.category === activeCategory)
  const categories = menu.length > 0 ? ["all", ...new Set(menu.map((item) => item.category))] : ["all"]

  if (loading) {
    return (
      <div className="container py-8 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded mb-4"></div>
        <div className="h-64 w-full bg-muted rounded-xl mb-6"></div>
        <div className="h-10 w-full bg-muted rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (<div key={i} className="h-48 bg-muted rounded-xl"></div>))}
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">找不到餐廳</h1>
          <Button asChild>
            <Link href="/user/home">返回首頁</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 bg-gray-100 min-h-screen">
      {/* 返回按鈕 */}
      <div className="container py-4">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link href="/user/home">
            <ChevronLeft className="h-4 w-4" />
            <span>返回</span>
          </Link>
        </Button>
      </div>

      {/* 餐廳封面 */}
      <div className="relative h-64 w-full bg-gray-300 mb-4">
        <Image
          src={restaurant.coverImage || getRestaurantCover(restaurant.name)}
          alt={stripStoreCode(restaurant.name)}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="container">
            <div className="flex justify-between items-end">
              <div>
                {/* 不再顯示店家代號 */}
                <h1 className="text-3xl font-bold mb-2">{stripStoreCode(restaurant.name)}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {restaurant.cuisine}
                  </Badge>
                  <span>⭐ {restaurant.rating}</span>
                  <span>•</span>
                  <span>{restaurant.deliveryTime}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                onClick={handleToggleFavorite}
              >
                <Heart className={isFavorite(restaurant.id) ? "fill-white" : ""} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="container py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左側內容區域 */}
          <div className="w-full lg:w-8/12">
            {/* AI 推薦 */}
            <DishRecommender restaurantName={stripStoreCode(restaurant.name)} cuisine={restaurant.cuisine} menu={menu} />

            {/* 標籤切換 */}
            <Tabs
              value={activeCategory === "all" ? "menu" : activeCategory}
              onValueChange={(value) => {
                if (value === "menu") setActiveCategory("all")
                else setActiveCategory(value)
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6 bg白 rounded-lg overflow-hidden">
                <TabsTrigger value="menu" className="data-[state=active]:bg-white data-[state=active]:shadow-none py-4 rounded-none">
                  菜單
                </TabsTrigger>
                <TabsTrigger value="info" className="data-[state=active]:bg-gray-100 data-[state=active]:shadow-none py-4 rounded-none">
                  餐廳資訊
                </TabsTrigger>
              </TabsList>

              {/* 菜單內容 */}
              <TabsContent value="menu" className="mt-0">
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6">熱門餐點</h2>
                  <div className="space-y-4">
                    {filteredMenu.filter((item) => item.isPopular).map((item, index) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        cuisine={restaurant.cuisine}
                        index={index}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>

                  {filteredMenu.filter((item) => !item.isPopular).length > 0 && (
                    <>
                      <h2 className="text-xl font-bold mb-6 mt-8">其他餐點</h2>
                      <div className="space-y-4">
                        {filteredMenu.filter((item) => !item.isPopular).map((item, index) => (
                          <MenuItemCard
                            key={item.id}
                            item={item}
                            cuisine={restaurant.cuisine}
                            index={index}
                            onAddToCart={handleAddToCart}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* 餐廳資訊內容 */}
              <TabsContent value="info" className="mt-0">
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">餐廳資訊</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">最低消費</span>
                      <span className="font-medium">${restaurant.minimumOrder}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">外送費</span>
                      <span className="font-medium">${restaurant.deliveryFee}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">預計送達時間</span>
                      <span className="font-medium">{restaurant.deliveryTime}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">地址</span>
                      <span className="font-medium">{restaurant.address}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">電話</span>
                      <span className="font-medium">{restaurant.phone}</span>
                    </div>
                    <div className="pt-2">
                      <Badge variant="outline" className="bg-gray-100">
                        {restaurant.cuisine}
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 右側餐廳資訊 (桌面版) */}
          <div className="w-full lg:w-4/12 hidden lg:block">
            <div className="bg-white rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">餐廳資訊</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">最低消費</span>
                  <span className="font-medium">${restaurant.minimumOrder}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">外送費</span>
                  <span className="font-medium">${restaurant.deliveryFee}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">預計送達時間</span>
                  <span className="font-medium">{restaurant.deliveryTime}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">地址</span>
                  <span className="font-medium">{restaurant.address}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">電話</span>
                  <span className="font-medium">{restaurant.phone}</span>
                </div>
                <div className="pt-2">
                  <Badge variant="outline" className="bg-gray-100">
                    {restaurant.cuisine}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 購物車按鈕 */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
          <div className="container">
            <Button className="w-full bg-orange-500 hover:bg-orange-600" size="lg" asChild>
              <Link href="/user/cart">查看購物車 ({count} 件商品)</Link>
            </Button>
          </div>
        </div>
      )}

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
