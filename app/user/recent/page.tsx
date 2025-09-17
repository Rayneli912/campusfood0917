"use client"

import { useState, useEffect } from "react"
import { useRecentViews } from "@/hooks/use-recent-views"
import { useFavorites } from "@/hooks/use-favorites"
import { getStoreById, stores as defaultStores } from "@/lib/data"
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
        const seen = new Set<string>()
        const ids = views
          .map(v => v?.id)
          .filter((id): id is string => Boolean(id) && !seen.has(id) && (seen.add(id), true))

        const stores = await Promise.all(ids.map(async (id) => {
          try {
            // 1. 嘗試使用 getStoreById
            let store: any = null
            try {
              store = getStoreById(id)
            } catch {
              store = null
            }
            if (store) return store

            // 2. 從註冊店家中查找
            const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
            store = registeredStores.find((s: any) => String(s.id) === String(id))
            if (store) return store

            // 3. 從預設店家中查找
            store = defaultStores.find(s => String(s.id) === String(id))
            return store || null
          } catch {
            return null
          }
        }))
        if (alive) setRecentStores(stores.filter(Boolean) as Store[])
      } catch {
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
