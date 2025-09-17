"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { storage } from "@/lib/storage-adapter"
import { notifyDataUpdate, CART_UPDATED } from "@/lib/sync-service"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  storeId: string
}

function readUserId(): string | null {
  try {
    const u = storage.local.getItem("user")
    return u ? JSON.parse(u)?.id ?? null : null
  } catch { return null }
}

const cartKey = (uid: string) => `user_${uid}_cart`

function migrateCart(uid: string) {
  const candidates = [
    `user:${uid}:cart`,
    `cart_${uid}`,
    `cart-${uid}`,
    "cart",
  ]
  for (const k of candidates) {
    try {
      const val = storage.local.getItem(k)
      if (!val) continue
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) {
        storage.local.setJSON(cartKey(uid), parsed)
        storage.local.removeItem(k)
        break
      }
    } catch {}
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const load = useCallback(() => {
    const uid = readUserId()
    if (!uid) { setItems([]); return }
    migrateCart(uid)
    const arr = storage.local.getJSON<CartItem[]>(cartKey(uid), [])
    setItems(Array.isArray(arr) ? arr : [])
  }, [])

  useEffect(() => {
    load()
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.cart) setItems(detail.cart)
      else load()
    }
    window.addEventListener(CART_UPDATED as any, onUpdated)
    window.addEventListener("cartUpdated" as any, onUpdated)
    return () => {
      window.removeEventListener(CART_UPDATED as any, onUpdated)
      window.removeEventListener("cartUpdated" as any, onUpdated)
    }
  }, [load])

  const save = (next: CartItem[]) => {
    const uid = readUserId()
    if (!uid) return false
    storage.local.setJSON(cartKey(uid), next)
    setItems(next)
    window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { userId: uid, cart: next } }))
    notifyDataUpdate(CART_UPDATED, { userId: uid, cart: next })
    return true
  }

  // 你在頁面中會用 getCart(storeId)
  const getCart = useCallback((storeId?: string) => {
    return storeId ? items.filter(i => String(i.storeId) === String(storeId)) : items
  }, [items])

  // 若目前購物車已有其他店家的品項，直接丟事件給外層彈窗處理
  const addToCart = (item: CartItem): boolean => {
    const hasOtherStore = items.length > 0 && items.some(i => String(i.storeId) !== String(item.storeId))
    if (hasOtherStore) {
      window.dispatchEvent(new CustomEvent("cartDifferentStoreAttempt", {
        detail: { conflictStoreId: items[0].storeId, attemptStoreId: item.storeId, item }
      }))
      return false
    }
    const exists = items.find(i => i.id === item.id && String(i.storeId) === String(item.storeId))
    const next = exists
      ? items.map(i => i === exists ? { ...i, quantity: i.quantity + item.quantity } : i)
      : [item, ...items]
    return save(next)
  }

  const forceSwitchStoreAndAdd = (storeId: string, item: CartItem) => {
    // 清空後加入
    return save([{ ...item, storeId }])
  }

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) return remove(id)
    const next = items.map(i => i.id === id ? { ...i, quantity: newQuantity } : i)
    return save(next)
  }

  const remove = (id: string) => save(items.filter(i => i.id !== id))
  const clear = () => save([])

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])
  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.price, 0), [items])

  return { items, getCart, addToCart, updateQuantity, forceSwitchStoreAndAdd, remove, clear, count, total, reload: load }
}
