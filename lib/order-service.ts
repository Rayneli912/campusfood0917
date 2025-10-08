// lib/order-service.ts
// Import required modules
import { format } from "date-fns"
import { syncOrderStatus } from "@/lib/sync-service"
import { getInventory, deduct, restock } from "@/lib/inventory-service"

// 事件名稱常量
export const ORDER_CREATED = "orderCreated"
export const ORDER_UPDATED = "orderUpdated"
export const ORDER_CANCELLED = "orderCancelled"
export const ORDER_COMPLETED = "orderCompleted"
export const ORDER_STATUS_CHANGED = "orderStatusChanged"
export const INVENTORY_UPDATED = "inventoryUpdated"

// 訂單狀態
export const ORDER_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PREPARED: "prepared",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
} as const

// 訂單項目
export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
}

// 訂單類型
export interface Order {
  id: string
  userId: string
  storeId: string
  storeName: string
  storeLocation?: string
  items: OrderItem[]
  total: number
  status: string
  createdAt: string
  acceptedAt?: string
  preparedAt?: string
  completedAt?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelReason?: string
  initialTime?: number
  /** 用戶備註（選填） */
  note?: string
}

// 內部工具：判斷是否逾期（以計時器為主，否則以 preparedAt + 10 分鐘）
function isExpired(order: Order): boolean {
  const timer = JSON.parse(localStorage.getItem(`orderTimer_${order.id}`) || "null")
  const byTimer = timer
    ? (Date.now() - new Date(timer.preparedAt).getTime()) / 1000 >= (timer.initialTime ?? 600)
    : false
  const byTime = order.preparedAt
    ? Date.now() - new Date(order.preparedAt).getTime() >= 10 * 60 * 1000
    : false
  return Boolean(byTimer || byTime)
}

// 訂單服務
const orderService = {
  // 創建訂單（建立時不扣庫存）
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    try {
      if (!orderData.userId || !orderData.storeId || !orderData.items?.length) {
        throw new Error("缺少必要的訂單資訊")
      }

      // 取得店家代號
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      const store = registeredStores.find((s: any) => String(s.id) === String(orderData.storeId))
      if (!store) throw new Error("找不到店家資訊")
      const storeCode = store.storeCode

      // 生成訂單編號
      const now = new Date()
      const orderDate = format(now, "yyyyMMdd")
      const orders = JSON.parse(localStorage.getItem("orders") || "[]")
      const todayOrders = orders.filter((o: any) => {
        const parts = String(o.id).split("-")
        return parts.length >= 3 && parts[1] === storeCode && parts[2] === orderDate
      })
      const sequence = String(todayOrders.length + 1).padStart(3, "0")
      const orderId = `order-${storeCode}-${orderDate}-${sequence}`

      const newOrder: Order = {
        id: orderId,
        userId: orderData.userId!,
        storeId: orderData.storeId!,
        storeName: orderData.storeName || "",
        storeLocation: orderData.storeLocation || "",
        items: orderData.items!,
        total: orderData.items!.reduce((sum, i) => sum + i.price * i.quantity, 0),
        status: ORDER_STATUS.PENDING,
        createdAt: now.toISOString(),
        note: (orderData.note ?? "").toString().trim() || undefined,
      }

      // 寫入 orders（最新在最上）
      orders.unshift(newOrder)
      localStorage.setItem("orders", JSON.stringify(orders))

      // 寫入使用者訂單列表
      const userKey = `userOrders_${newOrder.userId}`
      const userOrders = JSON.parse(localStorage.getItem(userKey) || "[]")
      userOrders.unshift(newOrder)
      localStorage.setItem(userKey, JSON.stringify(userOrders))

      // 廣播
      window.dispatchEvent(new CustomEvent(ORDER_CREATED, { detail: { order: newOrder } }))
      return newOrder
    } catch (error) {
      console.error("創建訂單失敗:", error)
      throw error
    }
  },

  // 更新訂單狀態（包含逾時阻擋）
  async updateOrderStatus(orderId: string, status: string, updatedBy: string = "system", reason?: string): Promise<Order> {
    try {
      const orders: Order[] = JSON.parse(localStorage.getItem("orders") || "[]")
      const orderIndex = orders.findIndex((o: any) => o.id === orderId)
      if (orderIndex === -1) throw new Error("找不到訂單")

      const order = orders[orderIndex]
      const now = new Date().toISOString()
      const previousStatus = order.status

      // 防呆：若嘗試完成但已逾時，直接改為取消（逾期未取）
      if (status === ORDER_STATUS.COMPLETED && isExpired(order)) {
        status = ORDER_STATUS.CANCELLED
        reason = "逾期未取"
      }

      const updatedOrder: Order = { ...order, status }

      switch (status) {
        case ORDER_STATUS.ACCEPTED: {
          updatedOrder.acceptedAt = now
          // 接單 → 檢查並扣庫存
          const ok = await checkAndUpdateStock(order.storeId, order.items)
          if (!ok) throw new Error("商品庫存不足")
          break
        }
        case ORDER_STATUS.PREPARED: {
          updatedOrder.preparedAt = now
          localStorage.setItem(
            `orderTimer_${orderId}`,
            JSON.stringify({ startAt: now, left: 600, preparedAt: now, initialTime: 600 })
          )
          break
        }
        case ORDER_STATUS.COMPLETED: {
          updatedOrder.completedAt = now
          localStorage.removeItem(`orderTimer_${orderId}`)
          await updateSalesData(order)
          break
        }
        case ORDER_STATUS.CANCELLED:
        case ORDER_STATUS.REJECTED: {
          updatedOrder.cancelledAt = now
          updatedOrder.cancelledBy = updatedBy
          updatedOrder.cancelReason = reason || "未提供原因"
          localStorage.removeItem(`orderTimer_${orderId}`)
          // 若之前扣過庫存，回補
          if (previousStatus === ORDER_STATUS.ACCEPTED || previousStatus === ORDER_STATUS.PREPARED) {
            await restoreProductQuantities(order.storeId, order.items)
          }
          break
        }
      }

      // 寫回 orders
      orders[orderIndex] = updatedOrder
      localStorage.setItem("orders", JSON.stringify(orders))

      // 同步使用者的訂單列表
      const userKey = `userOrders_${order.userId}`
      const userOrders = JSON.parse(localStorage.getItem(userKey) || "[]")
      const idx = userOrders.findIndex((o: any) => o.id === orderId)
      if (idx !== -1) {
        userOrders[idx] = updatedOrder
        localStorage.setItem(userKey, JSON.stringify(userOrders))
      }

      // 廣播
      window.dispatchEvent(
        new CustomEvent(ORDER_STATUS_CHANGED, { detail: { orderId, previousStatus, currentStatus: status } })
      )
      window.dispatchEvent(new CustomEvent(ORDER_UPDATED, { detail: { order: updatedOrder } }))

      // ✅ 帶參數同步（很重要）
      await syncOrderStatus(orderId, status, updatedBy, updatedOrder.cancelReason)

      return updatedOrder
    } catch (error) {
      console.error("更新訂單狀態失敗:", error)
      throw error
    }
  },
}

// ✅ 檢查＋扣庫存：走 inventory-service
async function checkAndUpdateStock(storeId: string, orderedItems: OrderItem[]): Promise<boolean> {
  try {
    const foodItems = await getInventory(storeId)

    // 檢查庫存與上架
    for (const orderedItem of orderedItems) {
      const foodItem = foodItems.find((item: any) => String(item.id) === String(orderedItem.id))
      if (!foodItem || !foodItem.isListed || (foodItem.quantity ?? 0) < orderedItem.quantity) {
        return false
      }
    }

    // 扣庫存
    for (const orderedItem of orderedItems) {
      await deduct(storeId, orderedItem.id, orderedItem.quantity)
    }
    return true
  } catch (error) {
    console.error("檢查並更新庫存時發生錯誤:", error)
    throw error
  }
}

// ✅ 回補庫存
async function restoreProductQuantities(storeId: string, orderedItems: OrderItem[]) {
  try {
    for (const orderedItem of orderedItems) {
      await restock(storeId, orderedItem.id, orderedItem.quantity)
    }
  } catch (error) {
    console.error("恢復商品庫存時發生錯誤:", error)
    throw error
  }
}

// 更新銷售數據（原邏輯保留）
async function updateSalesData(order: Order): Promise<void> {
  try {
    const salesKey = `sales_${order.storeId}`
    const salesData = JSON.parse(localStorage.getItem(salesKey) || "{}")

    const today = format(new Date(), "yyyy-MM-dd")
    if (!salesData[today]) {
      salesData[today] = { totalAmount: 0, orderCount: 0, items: {} }
    }

    salesData[today].totalAmount += order.total
    salesData[today].orderCount += 1

    order.items.forEach((item) => {
      if (!salesData[today].items[item.id]) {
        salesData[today].items[item.id] = { name: item.name, quantity: 0, revenue: 0 }
      }
      salesData[today].items[item.id].quantity += item.quantity
      salesData[today].items[item.id].revenue += item.price * item.quantity
    })

    localStorage.setItem(salesKey, JSON.stringify(salesData))
  } catch (error) {
    console.error("更新銷售數據時發生錯誤:", error)
    throw error
  }
}

// 相容保留（不在建立訂單時扣庫存）
async function updateProductQuantities(_storeId: string, _orderedItems: OrderItem[]) {
  console.warn("updateProductQuantities() 已不建議於建立訂單階段呼叫，改為於接單(ACCEPTED)時扣庫存。")
}

// 便捷函數
export const completeOrder = (orderId: string) =>
  orderService.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED)
export const acceptOrder = (orderId: string) =>
  orderService.updateOrderStatus(orderId, ORDER_STATUS.ACCEPTED)
export const prepareOrder = (orderId: string) =>
  orderService.updateOrderStatus(orderId, ORDER_STATUS.PREPARED)
export const cancelOrder = (orderId: string, reason?: string) =>
  orderService.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED, "user", reason)
export const rejectOrder = (orderId: string, reason?: string) =>
  orderService.updateOrderStatus(orderId, ORDER_STATUS.REJECTED, "store", reason)

export default orderService
