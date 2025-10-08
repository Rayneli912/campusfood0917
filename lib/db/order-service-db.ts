// 訂單資料庫服務
import { supabase } from "../supabase/client"
import { supabaseAdmin } from "../supabase/admin"

export interface Order {
  id: string // order-S001-20231015-001
  user_id: string
  store_id: string
  store_name: string
  store_location?: string | null
  total: number
  status: "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected" | "expired"
  customer_info?: any | null
  note?: string | null
  cancellation_reason?: string | null
  expires_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  order_id: string
  food_item_id: string
  name: string
  price: number
  quantity: number
  subtotal: number
  created_at: string
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

export class OrderServiceDB {
  // ==================== 訂單管理 ====================

  // 生成訂單編號
  static generateOrderId(storeCode: string, date: Date): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "")
    // 這裡簡化處理，實際應該查詢當天的訂單數量
    const sequence = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `order-${storeCode}-${dateStr}-${sequence}`
  }

  // 創建訂單
  static async createOrder(orderData: {
    user_id: string
    store_id: string
    store_name: string
    store_location?: string
    items: Array<{
      food_item_id: string
      name: string
      price: number
      quantity: number
    }>
    customer_info?: any
    note?: string
  }): Promise<{ success: boolean; order?: OrderWithItems; message?: string }> {
    try {
      // 獲取店家代號
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("store_code")
        .eq("id", orderData.store_id)
        .single()

      if (storeError || !store) {
        return { success: false, message: "找不到店家資訊" }
      }

      // 生成訂單編號
      const orderId = this.generateOrderId(store.store_code, new Date())

      // 計算總金額
      const total = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      // 創建訂單
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            id: orderId,
            user_id: orderData.user_id,
            store_id: orderData.store_id,
            store_name: orderData.store_name,
            store_location: orderData.store_location || null,
            total,
            status: "pending",
            customer_info: orderData.customer_info || null,
            note: orderData.note || null,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分鐘後過期
          },
        ])
        .select()
        .single()

      if (orderError) throw orderError

      // 創建訂單明細
      const orderItems = orderData.items.map((item) => ({
        order_id: orderId,
        food_item_id: item.food_item_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }))

      const { data: createdItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select()

      if (itemsError) throw itemsError

      // 扣減商品庫存
      for (const item of orderData.items) {
        const { data: product } = await supabase
          .from("store_products")
          .select("quantity")
          .eq("id", item.food_item_id)
          .single()

        if (product) {
          await supabase
            .from("store_products")
            .update({ quantity: product.quantity - item.quantity })
            .eq("id", item.food_item_id)
        }
      }

      return {
        success: true,
        order: {
          ...newOrder,
          items: createdItems,
        },
      }
    } catch (error) {
      console.error("創建訂單失敗:", error)
      return { success: false, message: "創建訂單時發生錯誤" }
    }
  }

  // 獲取用戶訂單
  static async getUserOrders(userId: string): Promise<OrderWithItems[]> {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          items:order_items(*)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError
      return orders || []
    } catch (error) {
      console.error("獲取用戶訂單失敗:", error)
      return []
    }
  }

  // 獲取店家訂單
  static async getStoreOrders(storeId: string): Promise<OrderWithItems[]> {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          items:order_items(*)
        `
        )
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError
      return orders || []
    } catch (error) {
      console.error("獲取店家訂單失敗:", error)
      return []
    }
  }

  // 獲取所有訂單（管理員用）
  static async getAllOrders(): Promise<OrderWithItems[]> {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          items:order_items(*)
        `
        )
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError
      return orders || []
    } catch (error) {
      console.error("獲取所有訂單失敗:", error)
      return []
    }
  }

  // 獲取單個訂單
  static async getOrderById(orderId: string): Promise<OrderWithItems | null> {
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          items:order_items(*)
        `
        )
        .eq("id", orderId)
        .single()

      if (error) throw error
      return order
    } catch (error) {
      console.error("獲取訂單失敗:", error)
      return null
    }
  }

  // 更新訂單狀態
  static async updateOrderStatus(
    orderId: string,
    status: Order["status"],
    additionalData?: {
      cancellation_reason?: string
      completed_at?: string
      cancelled_at?: string
    }
  ): Promise<boolean> {
    try {
      const updateData: any = { status }

      if (additionalData) {
        if (additionalData.cancellation_reason) {
          updateData.cancellation_reason = additionalData.cancellation_reason
        }
        if (additionalData.completed_at) {
          updateData.completed_at = additionalData.completed_at
        }
        if (additionalData.cancelled_at) {
          updateData.cancelled_at = additionalData.cancelled_at
        }
      }

      // 如果訂單被取消或拒絕，恢復庫存
      if (status === "cancelled" || status === "rejected") {
        const order = await this.getOrderById(orderId)
        if (order) {
          for (const item of order.items) {
            const { data: product } = await supabase
              .from("store_products")
              .select("quantity")
              .eq("id", item.food_item_id)
              .single()

            if (product) {
              await supabase
                .from("store_products")
                .update({ quantity: product.quantity + item.quantity })
                .eq("id", item.food_item_id)
            }
          }
        }
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("更新訂單狀態失敗:", error)
      return false
    }
  }

  // 店家接受訂單
  static async acceptOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, "accepted")
  }

  // 店家準備完成
  static async prepareOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, "prepared")
  }

  // 完成訂單
  static async completeOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, "completed", {
      completed_at: new Date().toISOString(),
    })
  }

  // 取消訂單
  static async cancelOrder(
    orderId: string,
    reason?: string
  ): Promise<boolean> {
    return this.updateOrderStatus(orderId, "cancelled", {
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
  }

  // 拒絕訂單
  static async rejectOrder(
    orderId: string,
    reason?: string
  ): Promise<boolean> {
    return this.updateOrderStatus(orderId, "rejected", {
      cancellation_reason: reason,
    })
  }

  // 訂單過期處理
  static async expireOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, "expired")
  }

  // 檢查並處理過期訂單
  static async checkExpiredOrders(): Promise<number> {
    try {
      const { data: expiredOrders, error } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "pending")
        .lt("expires_at", new Date().toISOString())

      if (error) throw error

      let count = 0
      for (const order of expiredOrders || []) {
        const success = await this.expireOrder(order.id)
        if (success) count++
      }

      return count
    } catch (error) {
      console.error("檢查過期訂單失敗:", error)
      return 0
    }
  }

  // 獲取用戶活躍訂單
  static async getUserActiveOrder(userId: string): Promise<OrderWithItems | null> {
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          items:order_items(*)
        `
        )
        .eq("user_id", userId)
        .in("status", ["pending", "accepted", "prepared"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error) return null
      return order
    } catch (error) {
      return null
    }
  }

  // 統計數據
  static async getOrderStats(storeId?: string): Promise<{
    total: number
    pending: number
    active: number
    completed: number
    cancelled: number
  }> {
    try {
      let query = supabase.from("orders").select("status")

      if (storeId) {
        query = query.eq("store_id", storeId)
      }

      const { data: orders, error } = await query

      if (error) throw error

      const stats = {
        total: orders?.length || 0,
        pending: orders?.filter((o) => o.status === "pending").length || 0,
        active:
          orders?.filter((o) =>
            ["pending", "accepted", "prepared"].includes(o.status)
          ).length || 0,
        completed: orders?.filter((o) => o.status === "completed").length || 0,
        cancelled:
          orders?.filter((o) =>
            ["cancelled", "rejected", "expired"].includes(o.status)
          ).length || 0,
      }

      return stats
    } catch (error) {
      console.error("獲取訂單統計失敗:", error)
      return {
        total: 0,
        pending: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
      }
    }
  }
}

