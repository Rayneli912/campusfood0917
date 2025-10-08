"use client"

import { useEffect, useMemo, useState } from "react"
import { useFavorites } from "@/hooks/use-favorites"
import { StoreCard } from "@/components/store-card"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// 為了型別兼容（你的 hook 可能回傳 string[] 或 FavoriteItem[]）
type FavLike = string | { id?: string; type?: string; name?: string; image?: string; storeId?: string }

type Store = any

// ✅ 從資料庫 API 獲取店家資訊
async function getStoreByIdFromDB(id: string): Promise<Store | null> {
  try {
    const response = await fetch(`/api/user/stores?storeId=${id}`)
    const data = await response.json()
    
    if (data.success && data.restaurant) {
      return data.restaurant
    }
    return null
  } catch (error) {
    console.error("Failed to fetch store from API:", error)
    return null
  }
}

export default function FavoritesPage() {
  // 你的 hook 可能提供 { favorites, toggle } 或 { favorites, toggleFavorite }
  const favHook: any = useFavorites()
  const favorites: FavLike[] = Array.isArray(favHook?.favorites) ? favHook.favorites : []

  // 從 favorites 取出「店家 id」：同時相容 string[] 與 FavoriteItem[]，並去重
  const favoriteIds = useMemo(
    () => {
      const ids = favorites
        .map((f) => (typeof f === "string" ? f : f?.id))
        .filter((id): id is string => Boolean(id))
      // 使用 Set 去重，確保沒有重複的 ID
      return Array.from(new Set(ids))
    },
    [favorites],
  )

  const [favoriteStores, setFavoriteStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setIsLoading(true)
      try {
        if (favoriteIds.length === 0) {
          if (alive) setFavoriteStores([])
          return
        }
        
        console.log("🔍 載入收藏店家，IDs:", favoriteIds)
        
        // ✅ 從資料庫 API 獲取店家資訊
        const stores = await Promise.all(favoriteIds.map((id) => getStoreByIdFromDB(id)))
        
        console.log("🔍 獲取到的店家:", stores)
        
        // 過濾空值並去重，確保沒有重複的店家
        const validStores = stores.filter(Boolean) as Store[]
        const uniqueStores = validStores.filter((store, index, array) => 
          array.findIndex(s => String(s.id) === String(store.id)) === index
        )
        
        console.log("✅ 有效的店家:", uniqueStores)
        
        if (alive) setFavoriteStores(uniqueStores)
      } catch (error) {
        console.error("❌ 載入收藏店家失敗:", error)
        if (alive) setFavoriteStores([])
      } finally {
        if (alive) setIsLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [favoriteIds])

  // 判斷是否最愛：若 hook 有 isFavorite 就用；否則用本地陣列判斷
  const isFavorite = (id: string) => {
    if (typeof favHook?.isFavorite === "function") return !!favHook.isFavorite(id)
    return favoriteIds.includes(id)
  }

  // 切換最愛：相容新舊兩種 API
  const makeToggleHandler = (store: Store) => () => {
    const payload = {
      id: String(store.id),
      type: "store",
      name: store.name,
      image: store.coverImage || store.image,
    }
    if (typeof favHook?.toggle === "function") {
      // 新版：需要帶物件
      favHook.toggle(payload)
    } else if (typeof favHook?.toggleFavorite === "function") {
      // 舊版：只吃 id
      favHook.toggleFavorite(String(store.id))
    }
  }

  /* ---------------------------- UI ---------------------------- */

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">我的最愛</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">我的最愛</h1>

      {favoriteStores.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoriteStores.map((store, index) => (
            <StoreCard
              key={`${String(store.id)}-${index}`}
              store={store}
              isFavorite={isFavorite(String(store.id))}
              // StoreCard 的 onToggleFavorite 只會傳入 id，所以這裡用閉包包住 store
              onToggleFavorite={makeToggleHandler(store)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-medium mb-2">尚未收藏任何店家</h2>
          <p className="text-gray-500 mb-4">將您喜愛的店家加入收藏，方便下次查看</p>
          <Link href="/user/home">
            <Button>瀏覽店家</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
