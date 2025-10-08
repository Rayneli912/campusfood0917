"use client"

import { useCallback, useEffect, useState } from "react"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  storeId: string
  storeName?: string
  maxQuantity?: number
  isAvailable?: boolean
}

function readUserId(): string | null {
  try {
    const u = localStorage.getItem("user")
    return u ? JSON.parse(u)?.id ?? null : null
  } catch { return null }
}

export function useCartDB() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  // 从数据库加载购物车
  const loadCart = useCallback(async () => {
    const userId = readUserId()
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/cart?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setItems(data.cart || [])
      }
    } catch (error) {
      console.error("加载购物车失败:", error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  // 添加商品到购物车
  const addToCart = useCallback(async (item: CartItem) => {
    const userId = readUserId()
    if (!userId) {
      console.error("用户未登录")
      return false
    }

    // 检查是否跨店
    const currentStoreId = items[0]?.storeId
    if (currentStoreId && currentStoreId !== item.storeId) {
      // 触发跨店提示事件
      window.dispatchEvent(new CustomEvent("cartDifferentStoreAttempt", {
        detail: {
          conflictStoreId: currentStoreId,
          attemptStoreId: item.storeId,
          item,
        }
      }))
      return false
    }

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId: item.id,
          quantity: item.quantity,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setItems(data.cart || [])
        return true
      }
      return false
    } catch (error) {
      console.error("添加到购物车失败:", error)
      return false
    }
  }, [items])

  // 更新商品数量
  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    const userId = readUserId()
    if (!userId) return false

    try {
      const response = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId,
          quantity,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setItems(data.cart || [])
        return true
      }
      return false
    } catch (error) {
      console.error("更新购物车失败:", error)
      return false
    }
  }, [])

  // 移除商品
  const removeItem = useCallback(async (productId: string) => {
    return updateQuantity(productId, 0)
  }, [updateQuantity])

  // 清空购物车
  const clearCart = useCallback(async () => {
    const userId = readUserId()
    if (!userId) return false

    try {
      const response = await fetch(`/api/cart?userId=${userId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        setItems([])
        return true
      }
      return false
    } catch (error) {
      console.error("清空购物车失败:", error)
      return false
    }
  }, [])

  // 强制切换店家（清空购物车后添加）
  const forceSwitchStoreAndAdd = useCallback(async (item: CartItem) => {
    await clearCart()
    return addToCart(item)
  }, [clearCart, addToCart])

  // 获取购物车
  const getCart = useCallback(() => items, [items])

  // 计算总数
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  // 计算总价
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    items,
    loading,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    forceSwitchStoreAndAdd,
    getCart,
    count,
    total,
    refresh: loadCart,
  }
}

