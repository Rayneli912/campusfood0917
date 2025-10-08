// hooks/use-inventory.ts
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { storage } from "@/lib/storage-adapter"
import { USE_BACKEND, apiUrl } from "@/lib/env"

/**
 * 與現有專案欄位相容：
 * - quantity  : 庫存量（= 0 視為售罄）
 * - isListed  : 是否上架（false 於使用者端隱藏）
 * 其他欄位沿用現有資料結構（如 originalPrice / discountPrice）
 */
export interface InventoryItem {
  id: string
  name: string
  image?: string
  originalPrice?: number
  discountPrice?: number
  price?: number
  quantity: number
  isListed: boolean
  // 可依需求擴充 category / description ...
}

function keyForStore(storeId: string) {
  // 與現有程式一致：每店一把鍵
  return `foodItems_${storeId}`
}

/** 將後端回傳（可能為 stock/isAvailable）映射成本地 quantity/isListed */
function normalizeFromBackend(raw: any): InventoryItem {
  const quantity = typeof raw?.quantity === "number"
    ? raw.quantity
    : (typeof raw?.stock === "number" ? raw.stock : 0)
  const isListed = typeof raw?.isListed === "boolean"
    ? raw.isListed
    : (typeof raw?.isAvailable === "boolean" ? raw.isAvailable : quantity > 0)

  return {
    id: String(raw?.id ?? ""),
    name: String(raw?.name ?? ""),
    image: raw?.image,
    originalPrice: typeof raw?.originalPrice === "number" ? raw.originalPrice : undefined,
    discountPrice: typeof raw?.discountPrice === "number" ? raw.discountPrice : undefined,
    price: typeof raw?.price === "number" ? raw.price : (typeof raw?.discountPrice === "number" ? raw.discountPrice : raw?.originalPrice),
    quantity: Math.max(0, Number.isFinite(quantity) ? quantity : 0),
    isListed: !!isListed,
  }
}

/** 上行到後端時，同時攜帶兩套欄位以提高相容性 */
function buildBackendPatch(patch: Partial<InventoryItem>) {
  const out: any = { ...patch }
  if (patch.quantity != null) {
    out.stock = patch.quantity
  }
  if (patch.isListed != null) {
    out.isAvailable = patch.isListed
  }
  return out
}

export function useInventory(storeId?: string) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  /** Local 模式：載入 */
  const loadLocal = useCallback(() => {
    if (!storeId) { setItems([]); setLoading(false); return }
    const arr = storage.local.getJSON<InventoryItem[]>(keyForStore(storeId), [])
    // 容錯：確保欄位型別正確
    const safe = (Array.isArray(arr) ? arr : []).map(it => normalizeFromBackend(it))
    setItems(safe)
    setLoading(false)
  }, [storeId])

  /** 後端模式：載入 */
  const loadBackend = useCallback(async () => {
    if (!storeId) { setItems([]); setLoading(false); return }
    try {
      setLoading(true)
      const r = await fetch(apiUrl(`/api/stores/${encodeURIComponent(storeId)}/inventory`), { method: "GET" })
      if (!r.ok) throw new Error("fetch inventory failed")
      const data = await r.json()
      const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
      setItems(list.map(normalizeFromBackend))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [storeId])

  /** 初始化載入與模式切換 */
  useEffect(() => {
    if (USE_BACKEND) loadBackend()
    else loadLocal()
  }, [loadBackend, loadLocal])

  /** 事件同步（跨分頁/跨組件/三端） */
  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.storeId && storeId && detail.storeId !== storeId) return
      // 若事件攜帶完整 items，直接覆寫；否則重讀
      if (Array.isArray(detail?.items)) {
        setItems(detail.items.map(normalizeFromBackend))
      } else {
        if (USE_BACKEND) loadBackend()
        else loadLocal()
      }
    }
    window.addEventListener("inventoryUpdated" as any, onUpdated)
    return () => window.removeEventListener("inventoryUpdated" as any, onUpdated)
  }, [storeId, loadLocal, loadBackend])

  /** Local：統一保存並廣播 */
  const saveLocal = (next: InventoryItem[]) => {
    if (!storeId) return
    storage.local.setJSON(keyForStore(storeId), next)
    setItems(next)
    window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: { storeId, items: next } }))
  }

  /** Local：設置數量（<=0 自動下架） */
  const setQuantityLocal = (id: string, quantity: number) => {
    const q = Math.max(0, Math.floor(quantity))
    const next = items.map(it =>
      it.id === id
        ? { ...it, quantity: q, isListed: q > 0 ? it.isListed : false }
        : it
    )
    saveLocal(next)
  }

  /** Local：增量補貨（>0 可自動上架但不強制，保留原 isListed） */
  const restockLocal = (id: string, delta: number) => {
    const next = items.map(it => {
      if (it.id !== id) return it
      const q = Math.max(0, Math.floor((it.quantity ?? 0) + delta))
      return { ...it, quantity: q, isListed: q > 0 ? true : false }
    })
    saveLocal(next)
  }

  /** Local：扣庫存（<=0 自動下架） */
  const deductLocal = (id: string, delta: number) => {
    const next = items.map(it => {
      if (it.id !== id) return it
      const q = Math.max(0, Math.floor((it.quantity ?? 0) - Math.abs(delta)))
      return { ...it, quantity: q, isListed: q > 0 ? it.isListed : false }
    })
    saveLocal(next)
  }

  /** Local：上下架 */
  const setListedLocal = (id: string, listed: boolean) => {
    const next = items.map(it => it.id === id ? { ...it, isListed: !!listed } : it)
    saveLocal(next)
  }

  /** Backend：PATCH 單品（同送兩套欄位以提高相容性） */
  const patchBackend = async (id: string, patch: Partial<InventoryItem>) => {
    if (!storeId) return
    const r = await fetch(apiUrl(`/api/stores/${encodeURIComponent(storeId)}/inventory/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBackendPatch(patch)),
    })
    if (!r.ok) throw new Error("update inventory failed")
    const updated = await r.json()
    const list = Array.isArray(updated?.items) ? updated.items : (Array.isArray(updated) ? updated : [])
    const norm = list.map(normalizeFromBackend)
    setItems(norm)
    window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: { storeId, items: norm } }))
  }

  /** 對外 API（自動分流 local/backend） */
  const setQuantity = useCallback(async (id: string, quantity: number) => {
    if (USE_BACKEND) return patchBackend(id, { quantity: Math.max(0, Math.floor(quantity)), isListed: Math.max(0, Math.floor(quantity)) > 0 })
    return setQuantityLocal(id, quantity)
  }, [items, storeId])

  const restock = useCallback(async (id: string, delta: number) => {
    if (USE_BACKEND) {
      const current = items.find(i => i.id === id)?.quantity ?? 0
      const q = Math.max(0, Math.floor(current + delta))
      return patchBackend(id, { quantity: q, isListed: q > 0 })
    }
    return restockLocal(id, delta)
  }, [items, storeId])

  const deduct = useCallback(async (id: string, delta: number) => {
    if (USE_BACKEND) {
      const current = items.find(i => i.id === id)?.quantity ?? 0
      const q = Math.max(0, Math.floor(current - Math.abs(delta)))
      return patchBackend(id, { quantity: q, isListed: q > 0 })
    }
    return deductLocal(id, delta)
  }, [items, storeId])

  const setAvailability = useCallback(async (id: string, available: boolean) => {
    // available 對應 isListed
    if (USE_BACKEND) return patchBackend(id, { isListed: !!available })
    return setListedLocal(id, available)
  }, [items, storeId])

  /** Util */
  const getItem = useCallback((id: string) => items.find(i => i.id === id) ?? null, [items])
  const availableItems = useMemo(() => items.filter(i => i.isListed && (i.quantity ?? 0) > 0), [items])

  const refresh = useCallback(() => {
    if (USE_BACKEND) return loadBackend()
    return loadLocal()
  }, [loadBackend, loadLocal])

  return {
    items, availableItems, loading,
    getItem, setQuantity, restock, deduct, setAvailability,
    refresh,
  }
}
