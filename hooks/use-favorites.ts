"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { storage } from "@/lib/storage-adapter"
import { USE_BACKEND, apiUrl } from "@/lib/env"
import { notifyDataUpdate, FAVORITES_UPDATED } from "@/lib/sync-service"
import type { FavoriteItem } from "@/types"

function readUserId(): string | null {
  try {
    // 兩種 key 都相容
    const raw = storage.local.getItem("user") || storage.local.getItem("currentUser")
    return raw ? JSON.parse(raw)?.id ?? null : null
  } catch {
    return null
  }
}

const keyNew = (uid: string) => `user_${uid}_favorites`
const keyOld = (uid: string) => `user:${uid}:favorites`

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  // 將舊 key 內容搬到新 key
  const migrateIfNeeded = (uid: string) => {
    try {
      const oldArr = storage.local.getJSON<FavoriteItem[]>(keyOld(uid), null as any)
      if (oldArr && Array.isArray(oldArr)) {
        storage.local.setJSON(keyNew(uid), oldArr)
        storage.local.removeItem(keyOld(uid))
      }
    } catch {}
  }

  const loadLocal = useCallback(() => {
    const uid = readUserId()
    if (!uid) {
      setFavorites([])
      setLoading(false)
      return
    }
    migrateIfNeeded(uid)
    const arr = storage.local.getJSON<FavoriteItem[]>(keyNew(uid), [])
    // 去重處理，防止重複的收藏項目
    const validArr = Array.isArray(arr) ? arr : []
    const uniqueArr = validArr.filter((item, index, array) => 
      array.findIndex(i => String(i.id) === String(item.id)) === index
    )
    setFavorites(uniqueArr)
    setLoading(false)
  }, [])

  const loadBackend = useCallback(async () => {
    try {
      setLoading(true)
      const r = await fetch(apiUrl("/api/favorites"), { method: "GET" })
      if (!r.ok) throw new Error("fetch favorites failed")
      const data = await r.json()
      const items = Array.isArray(data) ? data : (data?.items ?? [])
      // 對後端資料也進行去重處理
      const uniqueItems = items.filter((item: any, index: number, array: any[]) => 
        array.findIndex((i: any) => String(i.id) === String(item.id)) === index
      )
      setFavorites(uniqueItems)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (USE_BACKEND) loadBackend()
    else loadLocal()
  }, [loadBackend, loadLocal])

  useEffect(() => {
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.items) {
        // 對接收到的資料也進行去重處理
        const validItems = Array.isArray(detail.items) ? detail.items : []
        const uniqueItems = validItems.filter((item: any, index: number, array: any[]) => 
          array.findIndex((i: any) => String(i.id) === String(item.id)) === index
        )
        setFavorites(uniqueItems)
      } else {
        loadLocal()
      }
    }
    // 舊事件名 + 新事件名 都接
    window.addEventListener("favoritesUpdated" as any, onLocal)
    window.addEventListener(FAVORITES_UPDATED as any, onLocal)
    // 跨分頁
    window.addEventListener("storage", loadLocal as EventListener)

    return () => {
      window.removeEventListener("favoritesUpdated" as any, onLocal)
      window.removeEventListener(FAVORITES_UPDATED as any, onLocal)
      window.removeEventListener("storage", loadLocal as EventListener)
    }
  }, [loadLocal])

  const isFavorite = useCallback(
    (id: string) => favorites.some(f => String(f.id) === String(id)),
    [favorites],
  )

  const saveLocal = (next: FavoriteItem[]) => {
    const uid = readUserId()
    if (!uid) return
    storage.local.setJSON(keyNew(uid), next)
    setFavorites(next)
    // 舊事件（for 相容）
    window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { userId: uid, items: next } }))
    // 新事件（與後台同步）
    notifyDataUpdate(FAVORITES_UPDATED, { userId: uid, favorites: next })
  }

  const addLocal = (item: FavoriteItem) => {
    if (!item?.id) return
    const exists = favorites.some(f => String(f.id) === String(item.id))
    if (exists) return // 如果已存在，直接返回不做任何操作
    const next = [item, ...favorites]
    saveLocal(next)
  }

  const removeLocal = (id: string) => {
    const next = favorites.filter(f => String(f.id) !== String(id))
    saveLocal(next)
  }

  const addBackend = async (item: FavoriteItem) => {
    const r = await fetch(apiUrl("/api/favorites"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
    if (!r.ok) throw new Error("add favorite failed")
    const next = await r.json()
    const items = Array.isArray(next) ? next : (next?.items ?? [])
    setFavorites(items)
    window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { items } }))
    const uid = readUserId()
    if (uid) notifyDataUpdate(FAVORITES_UPDATED, { userId: uid, favorites: items })
  }

  const removeBackend = async (id: string) => {
    const r = await fetch(apiUrl(`/api/favorites/${encodeURIComponent(id)}`), { method: "DELETE" })
    if (!r.ok) throw new Error("remove favorite failed")
    const next = await r.json()
    const items = Array.isArray(next) ? next : (next?.items ?? [])
    setFavorites(items)
    window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { items } }))
    const uid = readUserId()
    if (uid) notifyDataUpdate(FAVORITES_UPDATED, { userId: uid, favorites: items })
  }

  const add = useCallback(async (item: FavoriteItem) => {
    if (USE_BACKEND) return addBackend(item)
    return addLocal(item)
  }, [favorites])

  const remove = useCallback(async (id: string) => {
    if (USE_BACKEND) return removeBackend(id)
    return removeLocal(id)
  }, [favorites])

  const toggle = useCallback(async (item: FavoriteItem) => {
    if (isFavorite(item.id)) return remove(item.id)
    return add(item)
  }, [isFavorite, add, remove])

  const count = useMemo(() => favorites.length, [favorites])
  const refresh = useCallback(() => (USE_BACKEND ? loadBackend() : loadLocal()), [loadBackend, loadLocal])

  return { favorites, isFavorite, add, remove, toggle, count, loading, refresh }
}
