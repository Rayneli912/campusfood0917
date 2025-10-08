"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { generateOrderId } from "@/lib/order-utils"
import { storage } from "@/lib/storage-adapter"
import { USE_BACKEND } from "@/lib/env"

export interface OrderItem { id: string; name: string; price: number; quantity: number; image?: string }
export interface Order {
  id: string; userId: string; storeId: string; storeName: string; storeLocation?: string;
  items: OrderItem[]; total: number; status: string; createdAt: string; [k: string]: any
}

export function useOrders() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [orderHistory, setOrderHistory] = useState<Order[]>([])
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLocal = useCallback(() => {
    try {
      const userStr = storage.local.getItem("user"); if (!userStr) { setLoading(false); return }
      const user = JSON.parse(userStr); const userId = user.id
      const ordersStr = storage.local.getItem("orders"); setOrders(ordersStr ? JSON.parse(ordersStr) : [])
      const histStr = storage.local.getItem(`userOrders_${userId}`); setOrderHistory(histStr ? JSON.parse(histStr) : [])
      const act = storage.local.getItem(`activeOrder_${userId}`)
      if (act && act !== "null") { try { const a = JSON.parse(act); setActiveOrder(a) } catch {} }
      setLoading(false)
    } catch (e) {
      console.error("fetchLocal error", e)
      setLoading(false)
    }
  }, [])

  const fetchBackend = useCallback(async () => {
    try {
      setLoading(true)
      const r = await fetch("/api/orders", { method: "GET" })
      if (!r.ok) throw new Error("fetch orders failed")
      const data = await r.json()
      setOrders(data?.active ?? [])
      setOrderHistory(data?.history ?? [])
      setActiveOrder(data?.current ?? null)
      setLoading(false)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (USE_BACKEND) fetchBackend()
    else fetchLocal()
  }, [fetchBackend, fetchLocal])

  // 送出訂單（local 模式）
  const placeLocalOrder = useCallback((payload: { storeId: string; storeName: string; storeLocation?: string; items: OrderItem[]; userId: string; total: number }) => {
    const { storeId, storeName, storeLocation, items, userId, total } = payload
    const newOrder: Order = {
      id: generateOrderId(storeId),
      userId, storeId, storeName, storeLocation,
      items, total, status: "submitted",
      createdAt: new Date().toISOString(),
    }

    // 全域 orders（店家端/管理端可見）
    const ordersStr = storage.local.getItem("orders")
    const allOrders: Order[] = ordersStr ? JSON.parse(ordersStr) : []
    allOrders.unshift(newOrder)
    storage.local.setItem("orders", JSON.stringify(allOrders))

    // 使用者歷史
    const histStr = storage.local.getItem(`userOrders_${userId}`)
    const hist: Order[] = histStr ? JSON.parse(histStr) : []
    hist.unshift(newOrder)
    storage.local.setItem(`userOrders_${userId}`, JSON.stringify(hist))

    // 設定 activeOrder（供追蹤）
    storage.local.setItem(`activeOrder_${userId}`, JSON.stringify(newOrder))
    setActiveOrder(newOrder)

    // 廣播事件
    window.dispatchEvent(new CustomEvent("orderStatusUpdated", { detail: { order: newOrder } }))

    toast({ title: "訂單已送出", description: `訂單編號：${newOrder.id}` })
    return newOrder
  }, [toast])

  // 送出訂單（backend 模式）
  const placeBackendOrder = useCallback(async (payload: any) => {
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error("place order failed")
    const newOrder = await r.json()
    setActiveOrder(newOrder)
    window.dispatchEvent(new CustomEvent("orderStatusUpdated", { detail: { order: newOrder } }))
    toast({ title: "訂單已送出", description: `訂單編號：${newOrder.id}` })
    return newOrder
  }, [toast])

  const placeOrder = useCallback(async (payload: { storeId: string; storeName: string; storeLocation?: string; items: OrderItem[]; userId: string; total: number }) => {
    if (USE_BACKEND) return await placeBackendOrder(payload)
    return placeLocalOrder(payload)
  }, [placeBackendOrder, placeLocalOrder])

  // 接單 / 取消 / 備餐完成 / 取餐完成（local）
  const updateLocalStatus = useCallback((orderId: string, patch: Partial<Order>) => {
    try {
      const ordersStr = storage.local.getItem("orders")
      let all: Order[] = ordersStr ? JSON.parse(ordersStr) : []
      all = all.map(o => o.id === orderId ? { ...o, ...patch } : o)
      storage.local.setItem("orders", JSON.stringify(all))

      const userStr = storage.local.getItem("user")
      const userId = userStr ? JSON.parse(userStr)?.id : null
      if (userId) {
        const histStr = storage.local.getItem(`userOrders_${userId}`)
        const hist: Order[] = histStr ? JSON.parse(histStr) : []
        const newHist = hist.map(o => o.id === orderId ? { ...o, ...patch } : o)
        storage.local.setItem(`userOrders_${userId}`, JSON.stringify(newHist))

        const actStr = storage.local.getItem(`activeOrder_${userId}`)
        if (actStr && actStr !== "null") {
          try {
            const act: Order = JSON.parse(actStr)
            if (act.id === orderId) {
              const updated = { ...act, ...patch }
              storage.local.setItem(`activeOrder_${userId}`, JSON.stringify(updated))
              setActiveOrder(updated)
            }
          } catch {}
        }
      }

      window.dispatchEvent(new CustomEvent("orderStatusUpdated", { detail: { orderId, patch } }))
    } catch (e) {
      console.error("updateLocalStatus error", e)
    }
  }, [])

  const updateBackendStatus = useCallback(async (orderId: string, patch: Partial<Order>) => {
    const r = await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
    if (!r.ok) throw new Error("update status failed")
    const updated = await r.json()
    setActiveOrder((prev) => prev && prev.id === orderId ? { ...prev, ...updated } : prev)
    window.dispatchEvent(new CustomEvent("orderStatusUpdated", { detail: { orderId, patch: updated } }))
  }, [])

  const updateStatus = useCallback(async (orderId: string, patch: Partial<Order>) => {
    if (USE_BACKEND) return await updateBackendStatus(orderId, patch)
    return updateLocalStatus(orderId, patch)
  }, [updateBackendStatus, updateLocalStatus])

  // 取消（local 快捷）
  const cancelLocalOrder = useCallback((orderId: string) => {
    updateLocalStatus(orderId, { status: "cancelled" })
    toast({ title: "已取消訂單" })
  }, [toast, updateLocalStatus])

  const cancelBackendOrder = useCallback(async (orderId: string) => {
    await updateBackendStatus(orderId, { status: "cancelled" })
    toast({ title: "已取消訂單" })
  }, [toast, updateBackendStatus])

  const cancelOrder = useCallback(async (orderId: string) => {
    if (USE_BACKEND) return await cancelBackendOrder(orderId)
    return cancelLocalOrder(orderId)
  }, [cancelBackendOrder, cancelLocalOrder])

  return {
    loading, orders, orderHistory, activeOrder,
    placeOrder, updateStatus, cancelOrder,
    refresh: () => (USE_BACKEND ? fetchBackend() : fetchLocal()),
  }
}
