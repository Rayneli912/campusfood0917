"use client"

import { useState, useEffect } from "react"
import { useRecentViews } from "@/hooks/use-recent-views"
import { useFavorites } from "@/hooks/use-favorites"
import { StoreCard } from "@/components/store-card"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type Store = any

export default function RecentViewsPage() {
  const { views, clear, loading } = useRecentViews()
  const { isFavorite, toggle } = useFavorites()
  const [recentStores, setRecentStores] = useState<Store[]>([])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        console.log("📥 近期浏览：views 数据:", views)
        
        const seen = new Set<string>()
        const ids = views
          .map(v => v?.id)
          .filter((id): id is string => Boolean(id) && !seen.has(id) && (seen.add(id), true))

        console.log("📥 近期浏览：提取的店家 IDs:", ids)

        if (ids.length === 0) {
          if (alive) setRecentStores([])
          return
        }

        const stores = await Promise.all(ids.map(async (id) => {
          try {
            // ✅ 從數據庫 API 獲取店家資料
            const res = await fetch(`/api/user/stores?storeId=${id}`)
            if (res.ok) {
              const json = await res.json()
              console.log(`✅ 获取店家 ${id} 成功:`, json.restaurant)
              return json.restaurant || null
            }
            console.error(`❌ 获取店家 ${id} 失败:`, res.status)
            return null
          } catch (e) {
            console.error(`❌ 获取店家 ${id} 错误:`, e)
            return null
          }
        }))
        
        const validStores = stores.filter(Boolean) as Store[]
        console.log("✅ 近期浏览：有效店家数量:", validStores.length, validStores)
        
        if (alive) setRecentStores(validStores)
      } catch (e) {
        console.error("❌ 加载近期浏览错误:", e)
        if (alive) setRecentStores([])
      }
    }
    load()
    return () => { alive = false }
  }, [views])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">近期瀏覽</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
        </div>
      </div>
    )
  }

  const canClear = views.length > 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">近期瀏覽</h1>
        {canClear && (
          <Button variant="outline" onClick={() => clear()}>
            清除記錄
          </Button>
        )}
      </div>

      {recentStores.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recentStores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              isFavorite={isFavorite(String(store.id))}
              onToggleFavorite={() => toggle({ id: String(store.id), type: "store", name: store.name, image: store.coverImage || store.image })}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-medium mb-2">尚無瀏覽記錄</h2>
          <p className="text-gray-500 mb-4">瀏覽店家後，系統會記錄您的足跡</p>
          <Link href="/user/home">
            <Button>瀏覽店家</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
