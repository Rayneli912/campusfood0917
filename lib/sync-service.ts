"use client"

import { format } from "date-fns"
import type { NewsItem, UserFullData } from "@/types"

// 事件名稱常數（沿用你原本）
export const STORE_DATA_UPDATED   = "store-data-updated"
export const PRODUCT_DATA_UPDATED = "product-data-updated"
export const ORDER_DATA_UPDATED   = "order-data-updated"
export const USER_DATA_UPDATED    = "user-data-updated"
export const NEWS_DATA_UPDATED    = "news-data-updated"
export const FAVORITES_UPDATED    = "favorites-updated"
export const RECENT_VIEWS_UPDATED = "recent-views-updated"
export const CART_UPDATED         = "cart-updated"

// 發送資料更新事件（沿用、僅小幅安全化）
export function notifyDataUpdate(eventName: string, data: any) {
  if (typeof window === "undefined") return

  const timestamp = Date.now()
  const updateData = { event: eventName, timestamp, data }

  // 觸發跨分頁同步
  localStorage.setItem("lastUpdate", JSON.stringify(updateData))

  // 觸發頁內自定義事件
  const evt = new CustomEvent(eventName, { detail: data })
  window.dispatchEvent(evt)

  // 觸發全局事件（你原本就有）
  const globalEvent = new CustomEvent("globalDataUpdate", { detail: updateData })
  window.dispatchEvent(globalEvent)
}

/* -------------------------- 通用存取與清理 -------------------------- */

function cleanupStorage() {
  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()
    const ONE_DAY = 24 * 60 * 60 * 1000

    keys.forEach((key) => {
      if (key === "lastUpdate") {
        const updateData = JSON.parse(localStorage.getItem(key) || "{}")
        if (now - (updateData.timestamp ?? 0) > ONE_DAY) {
          localStorage.removeItem(key)
        }
        return
      }
      const value = localStorage.getItem(key)
      if (value === "[]" || value === "{}") {
        localStorage.removeItem(key)
      }
    })
  } catch (err) {
    console.error("清理存儲空間時發生錯誤:", err)
  }
}

function setItemWithRetry(key: string, value: string, maxRetries = 3): boolean {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (value.length > 50000) {
        const chunkSize = 50000
        const chunks = Math.ceil(value.length / chunkSize)
        for (let j = 0; j < chunks; j++) {
          localStorage.setItem(`${key}_chunk_${j}`, value.slice(j * chunkSize, (j + 1) * chunkSize))
        }
        localStorage.setItem(`${key}_chunks`, String(chunks))
      } else {
        localStorage.setItem(key, value)
      }
      return true
    } catch (e) {
      if (i === maxRetries - 1) {
        console.error(`存儲數據失敗 (${key}):`, e)
        return false
      }
      cleanupStorage()
    }
  }
  return false
}

function getItemWithChunks(key: string): string | null {
  try {
    const chunks = localStorage.getItem(`${key}_chunks`)
    if (chunks) {
      const n = parseInt(chunks)
      let val = ""
      for (let i = 0; i < n; i++) {
        val += localStorage.getItem(`${key}_chunk_${i}`) || ""
      }
      return val
    }
    return localStorage.getItem(key)
  } catch (e) {
    console.error(`讀取數據失敗 (${key}):`, e)
    return null
  }
}

/* ------------------------------ 用戶資料 ------------------------------ */

export function updateUserData(userId: string, data: UserFullData): boolean {
  if (typeof window === "undefined") return false
  try {
    const {
      favorites,
      recentViews,
      cart,
      activeOrders,
      orderHistory,
      notificationSettings,
      privacySettings,
      ...basicData
    } = data

    const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
    const userIndex = registeredUsers.findIndex((u: any) => u.id === userId)

    if (userIndex !== -1) {
      const updatedUser = { ...registeredUsers[userIndex], ...basicData }
      registeredUsers[userIndex] = updatedUser
      if (!setItemWithRetry("registeredUsers", JSON.stringify(registeredUsers))) return false

      const currentUser = localStorage.getItem("user")
      if (currentUser) {
        const u = JSON.parse(currentUser)
        if (u.id === userId) {
          if (!setItemWithRetry("user", JSON.stringify(updatedUser))) return false
        }
      }
    }

    const updateIfNeeded = (key: string, value: any, maxItems = 10) => {
      if (value == null) return true
      if (Array.isArray(value)) value = value.slice(0, maxItems)
      return setItemWithRetry(key, JSON.stringify(value))
    }

    const results = [
      cart?.length && updateIfNeeded(`user_${userId}_cart`, cart, 5),
      activeOrders?.length && updateIfNeeded(`user_${userId}_activeOrders`, activeOrders, 3),
      favorites?.length && updateIfNeeded(`user_${userId}_favorites`, favorites, 10),
      recentViews?.length && updateIfNeeded(`user_${userId}_recentViews`, recentViews, 5),
      orderHistory?.length && updateIfNeeded(`user_${userId}_orderHistory`, orderHistory, 15),
      notificationSettings && updateIfNeeded(`user_${userId}_notifications`, notificationSettings),
      privacySettings && updateIfNeeded(`user_${userId}_privacy`, privacySettings),
    ]
    if (results.some((r) => r === false)) return false

    notifyDataUpdate(USER_DATA_UPDATED, { userId, data: basicData })
    return true
  } catch (e) {
    console.error("更新用戶數據時發生錯誤:", e)
    return false
  }
}

export function loadUserFullData(userId: string): UserFullData | null {
  try {
    const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
    const basicData = registeredUsers.find((u: any) => u.id === userId)
    if (!basicData) return null

    const getData = (key: string) => {
      const v = getItemWithChunks(key)
      return v ? JSON.parse(v) : null
    }

    return {
      ...basicData,
      favorites: getData(`user_${userId}_favorites`) || [],
      recentViews: getData(`user_${userId}_recentViews`) || [],
      cart: getData(`user_${userId}_cart`) || [],
      activeOrders: getData(`user_${userId}_activeOrders`) || [],
      orderHistory: getData(`user_${userId}_orderHistory`) || [],
      notificationSettings:
        getData(`user_${userId}_notifications`) || { email: true, push: true, orderUpdates: true, promotions: true },
      privacySettings: getData(`user_${userId}_privacy`) || { showProfile: true, showHistory: false },
    }
  } catch (e) {
    console.error("載入用戶完整數據時發生錯誤:", e)
    return null
  }
}

/* ------------------------------ 用戶偏好 ------------------------------ */

export function updateUserFavorites(userId: string, favorites: any[]) {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(`user_${userId}_favorites`, JSON.stringify(favorites))
    notifyDataUpdate(FAVORITES_UPDATED, { userId, favorites })
    return true
  } catch (e) {
    console.error("更新收藏時發生錯誤:", e)
    return false
  }
}

export function updateUserRecentViews(userId: string, recentViews: any[]) {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(`user_${userId}_recentViews`, JSON.stringify(recentViews))
    notifyDataUpdate(RECENT_VIEWS_UPDATED, { userId, recentViews })
    return true
  } catch (e) {
    console.error("更新近期瀏覽時發生錯誤:", e)
    return false
  }
}

export function updateUserCart(userId: string, cart: any[]) {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(`user_${userId}_cart`, JSON.stringify(cart))
    notifyDataUpdate(CART_UPDATED, { userId, cart })
    return true
  } catch (e) {
    console.error("更新購物車時發生錯誤:", e)
    return false
  }
}

/* --------------------------- 同步監聽與初始化 --------------------------- */

export function initDataSyncListeners(callback: (event: string, data: any) => void) {
  if (typeof window === "undefined") return

  window.addEventListener(STORE_DATA_UPDATED,   (e: any) => callback(STORE_DATA_UPDATED, e.detail))
  window.addEventListener(PRODUCT_DATA_UPDATED, (e: any) => callback(PRODUCT_DATA_UPDATED, e.detail))
  window.addEventListener(ORDER_DATA_UPDATED,   (e: any) => callback(ORDER_DATA_UPDATED, e.detail))
  window.addEventListener(USER_DATA_UPDATED,    (e: any) => callback(USER_DATA_UPDATED, e.detail))
  window.addEventListener(NEWS_DATA_UPDATED,    (e: any) => callback(NEWS_DATA_UPDATED, e.detail))
  window.addEventListener(FAVORITES_UPDATED,    (e: any) => callback(FAVORITES_UPDATED, e.detail))
  window.addEventListener(RECENT_VIEWS_UPDATED, (e: any) => callback(RECENT_VIEWS_UPDATED, e.detail))
  window.addEventListener(CART_UPDATED,         (e: any) => callback(CART_UPDATED, e.detail))

  window.addEventListener("storage", (e) => {
    if (e.key === "lastUpdate" && e.newValue) {
      const update = JSON.parse(e.newValue)
      callback(update.event, update.data)
    }
  })
}

export function initializeSyncService() {
  if (typeof window === "undefined") return

  window.addEventListener(
    "globalDataUpdate",
    ((event: CustomEvent) => {
      const { event: eventName, data } = event.detail
      handleDataUpdate(eventName, data)
    }) as EventListener,
  )

  window.addEventListener("storage", (e) => {
    if (e.key === "lastUpdate" && e.newValue) {
      const update = JSON.parse(e.newValue)
      handleDataUpdate(update.event, update.data)
    }
  })
}

/* ------------------------------ 事件回寫 ------------------------------ */

function handleDataUpdate(eventName: string, data: any) {
  switch (eventName) {
    case USER_DATA_UPDATED: {
      if (data?.userId) {
        const registeredUsersStr = getItemWithChunks("registeredUsers") || "[]"
        const list = JSON.parse(registeredUsersStr)
        const idx = list.findIndex((u: any) => u.id === data.userId)
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...data.data }
          if (!setItemWithRetry("registeredUsers", JSON.stringify(list))) {
            console.error("Failed to update registeredUsers after global update")
          }
        }
      }
      break
    }

    case FAVORITES_UPDATED:
    case RECENT_VIEWS_UPDATED:
    case CART_UPDATED: {
      if (data?.userId) {
        const key = `user_${data.userId}_${eventName.split("_")[0].toLowerCase()}`
        const v = getItemWithChunks(key)
        if (v) {
          const cur = JSON.parse(v)
          const updated = JSON.stringify(data[eventName.split("_")[0].toLowerCase()])
          if (JSON.stringify(cur) !== updated) {
            if (!setItemWithRetry(key, updated)) {
              console.error(`Failed to update ${key} after global update`)
            }
          }
        }
      }
      break
    }

    case STORE_DATA_UPDATED: {
      if (data?.storeId) {
        const cur = localStorage.getItem("currentStore")
        if (cur) {
          const s = JSON.parse(cur)
          if (s.id === data.storeId) {
            localStorage.setItem("currentStore", JSON.stringify(data.data))
          }
        }
      }
      break
    }

    case PRODUCT_DATA_UPDATED: {
      if (data?.storeId) {
        localStorage.setItem(`store_${data.storeId}_products`, JSON.stringify(data.products || []))
      }
      break
    }

    case ORDER_DATA_UPDATED: {
      if (data?.orderId) {
        const orders = JSON.parse(localStorage.getItem("orders") || "[]")
        const i = orders.findIndex((o: any) => o.id === data.orderId)
        if (i !== -1) {
          orders[i] = { ...orders[i], ...data.order }
          localStorage.setItem("orders", JSON.stringify(orders))
        }
      }
      break
    }

    case NEWS_DATA_UPDATED: {
      if (data?.newsId && data.deleted) {
        const list = (JSON.parse(localStorage.getItem("news") || "[]") as NewsItem[]).filter((n) => n.id !== data.newsId)
        localStorage.setItem("news", JSON.stringify(list))
      } else if (data?.newsId && data.news) {
        const list = JSON.parse(localStorage.getItem("news") || "[]") as NewsItem[]
        const idx = list.findIndex((n) => n.id === data.newsId)
        if (idx !== -1) {
          list[idx] = data.news
          localStorage.setItem("news", JSON.stringify(list))
        }
      } else if (data?.news) {
        localStorage.setItem("news", JSON.stringify(data.news))
      }
      break
    }
  }
}

/* ------------------------------ 週期同步 ------------------------------ */

export function startPeriodicSync() {
  if (typeof window === "undefined") return
  setInterval(() => {
    const currentUser = localStorage.getItem("user")
    if (currentUser) {
      const user = JSON.parse(currentUser)
      const userData = getItemWithChunks(`user_${user.id}_basic`)
      if (userData) {
        const updatedUser = JSON.parse(userData)
        if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
          localStorage.setItem("user", JSON.stringify(updatedUser))
          notifyDataUpdate(USER_DATA_UPDATED, { userId: user.id, data: updatedUser })
        }
      }
    }

    const currentStore = localStorage.getItem("currentStore")
    if (currentStore) {
      const store = JSON.parse(currentStore)
      const storeData = localStorage.getItem(`store_${store.id}_data`)
      if (storeData) {
        const updatedStore = JSON.parse(storeData)
        if (JSON.stringify(store) !== JSON.stringify(updatedStore)) {
          localStorage.setItem("currentStore", JSON.stringify(updatedStore))
          notifyDataUpdate(STORE_DATA_UPDATED, { storeId: store.id, data: updatedStore })
        }
      }
    }
  }, 5000)
}

/* ------------------------------ 小工具 ------------------------------ */

export function formatDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return ""
  try {
    const date = new Date(dateTimeStr)
    return format(date, "yyyy/MM/dd HH:mm:ss")
  } catch (e) {
    console.error("Date formatting error:", e)
    return dateTimeStr
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const date = new Date(dateStr)
    return format(date, "yyyy/MM/dd")
  } catch (e) {
    console.error("Date formatting error:", e)
    return dateStr
  }
}

/* ------------------------------ 同步介面 ------------------------------ */
/** 
 * 訂單狀態同步（店家端/管理端改狀態 → 全站同步）
 * 修正點：
 * 1) 若嘗試在逾期後完成取餐，會改為直接標記「cancelled」且 cancelReason = 逾期未取
 * 2) 事件與 localStorage 一起寫入，確保跨分頁即時同步
 */
export async function syncOrderStatus(
  orderId: string,
  status: string,
  updatedBy: string,
  reason?: string
): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]")
    const idx = orders.findIndex((o: any) => o.id === orderId)
    if (idx === -1) return false

    const now = new Date().toISOString()
    const order = orders[idx]
    const previousStatus = order.status

    // 是否逾時：優先讀計時器，其次用 preparedAt + 10 分鐘
    const timer = JSON.parse(localStorage.getItem(`orderTimer_${orderId}`) || "null")
    const expiredByTimer = timer ? (Date.now() - new Date(timer.preparedAt).getTime()) / 1000 >= (timer.initialTime ?? 600) : false
    const expiredByTime  = order.preparedAt ? (Date.now() - new Date(order.preparedAt).getTime()) >= 10 * 60 * 1000 : false
    const isExpired = expiredByTimer || expiredByTime

    const updatedOrder: any = { ...order, status, updatedAt: now, updatedBy }

    switch (status) {
      case "accepted":
        updatedOrder.acceptedAt = now
        break
      case "prepared":
        updatedOrder.preparedAt = now
        localStorage.setItem(
          `orderTimer_${orderId}`,
          JSON.stringify({ startAt: now, left: 600, preparedAt: now, initialTime: 600 }),
        )
        break
      case "completed":
        if (isExpired) {
          // 逾期後不可完成 → 直接轉 cancelled
          updatedOrder.status = "cancelled"
          updatedOrder.cancelledAt = now
          updatedOrder.cancelReason = "逾期未取"
          // 清除倒計時
          localStorage.removeItem(`orderTimer_${orderId}`)
        } else {
          updatedOrder.completedAt = now
          localStorage.removeItem(`orderTimer_${orderId}`)
        }
        break
      case "cancelled":
      case "rejected":
        updatedOrder.cancelledAt = now
        updatedOrder.cancelledBy = updatedBy
        updatedOrder.cancelReason = reason || "未提供原因"
        localStorage.removeItem(`orderTimer_${orderId}`)
        
        // 回補庫存（如果之前已接受或準備）
        if (previousStatus === "accepted" || previousStatus === "prepared") {
          await restoreInventoryAfterCancel(order)
        }
        break
    }

    orders[idx] = updatedOrder
    localStorage.setItem("orders", JSON.stringify(orders))

    // 廣播
    notifyDataUpdate(ORDER_DATA_UPDATED, { orderId, order: updatedOrder, previousStatus })

    return true
  } catch (error) {
    console.error("Error syncing order status:", error)
    return false
  }
}

/** 回補庫存（訂單取消時） */
async function restoreInventoryAfterCancel(order: any): Promise<void> {
  try {
    // 嘗試多個可能的庫存存儲位置
    const possibleKeys = [
      `store_${order.storeId}_products`,
      `store:${order.storeId}:items`,
      `store:${order.storeId}:products`,
      `products:${order.storeId}`,
      `foodItems:${order.storeId}`,
      `foods:${order.storeId}`,
      `foods`,
      `products`,
    ]

    for (const key of possibleKeys) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          const items = JSON.parse(data)
          if (Array.isArray(items) && items.length > 0) {
            let updated = false
            
            const updatedItems = items.map((item: any) => {
              const orderItem = order.items.find((oi: any) => 
                String(oi.id || oi.foodItemId) === String(item.id) &&
                (item.storeId == null || String(item.storeId) === String(order.storeId))
              )
              
              if (orderItem && typeof item.stock === "number") {
                const quantity = Number(orderItem.quantity) || 0
                const restoredStock = Math.max(0, Number(item.stock) + quantity)
                updated = true
                
                const updatedItem = { ...item, stock: restoredStock }
                
                // 如果有上下架狀態，庫存恢復後重新上架
                if ("isActive" in updatedItem && restoredStock > 0) {
                  updatedItem.isActive = true
                }
                if ("status" in updatedItem && typeof updatedItem.status === "string" && restoredStock > 0) {
                  if (updatedItem.status.toLowerCase() === "off") {
                    updatedItem.status = "on"
                  }
                }
                
                return updatedItem
              }
              return item
            })

            if (updated) {
              localStorage.setItem(key, JSON.stringify(updatedItems))
              // 廣播庫存更新事件
              window.dispatchEvent(new CustomEvent("inventoryUpdated", {
                detail: { storeId: order.storeId, restored: true }
              }))
              console.log(`[SyncService] Restored inventory for order ${order.id} in ${key}`)
              break // 成功更新一個存儲位置就退出
            }
          }
        } catch (parseError) {
          console.error(`Error parsing ${key}:`, parseError)
        }
      }
    }
  } catch (error) {
    console.error("Error restoring inventory:", error)
  }
}

/** 店家商品列表（店家端改動 → 用戶端同步） */
export async function syncFoodItems(storeId: string): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const products = JSON.parse(localStorage.getItem(`store_${storeId}_products`) || "[]")
    notifyDataUpdate(PRODUCT_DATA_UPDATED, { storeId, products })
    // 追加一個時間戳，強化跨分頁觸發
    localStorage.setItem(`store_${storeId}_products_ts`, String(Date.now()))
    return true
  } catch (e) {
    console.error("Error syncing food items:", e)
    return false
  }
}

/** 店家資料（店家端改動 → 用戶端同步） */
export async function syncStoreInfo(storeId: string): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const storeData = localStorage.getItem(`store_${storeId}_data`)
    if (storeData) {
      const store = JSON.parse(storeData)
      notifyDataUpdate(STORE_DATA_UPDATED, { storeId, data: store })
      localStorage.setItem(`store_${storeId}_data_ts`, String(Date.now()))
    }
    return true
  } catch (e) {
    console.error("Error syncing store info:", e)
    return false
  }
}

/** 管理端：整批覆蓋新聞（修正「按下發佈沒反應」→ 同時觸發事件與 storage） */
export async function syncNewsItems(news: NewsItem[]): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem("news", JSON.stringify(news))
    notifyDataUpdate(NEWS_DATA_UPDATED, { news })
    localStorage.setItem("news:ts", String(Date.now()))
    return true
  } catch (e) {
    console.error("同步新聞項目時發生錯誤:", e)
    return false
  }
}

/** 管理端：更新單筆新聞 */
export async function updateNewsItem(newsId: string, data: Partial<NewsItem>): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const news = (JSON.parse(localStorage.getItem("news") || "[]") as NewsItem[]) || []
    const i = news.findIndex((n) => n.id === newsId)
    if (i === -1) return false

    const now = new Date().toISOString()
    const updated = { ...news[i], ...data, updatedAt: now } as NewsItem
    if (data.isPublished !== undefined && data.isPublished !== news[i].isPublished) {
      (updated as any).publishedAt = data.isPublished ? now : undefined
    }

    news[i] = updated
    localStorage.setItem("news", JSON.stringify(news))
    notifyDataUpdate(NEWS_DATA_UPDATED, { newsId, news: updated })
    localStorage.setItem("news:ts", String(Date.now()))
    return true
  } catch (e) {
    console.error("更新新聞項目時發生錯誤:", e)
    return false
  }
}

/** 管理端：刪除單筆新聞 */
export async function deleteNewsItem(newsId: string): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const list = (JSON.parse(localStorage.getItem("news") || "[]") as NewsItem[]).filter((n) => n.id !== newsId)
    localStorage.setItem("news", JSON.stringify(list))
    notifyDataUpdate(NEWS_DATA_UPDATED, { newsId, deleted: true })
    localStorage.setItem("news:ts", String(Date.now()))
    return true
  } catch (e) {
    console.error("刪除新聞項目時發生錯誤:", e)
    return false
  }
}

/* ------------------------------ 初始化資料 ------------------------------ */

function initializeUserData(userId: string) {
  try {
    const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
    const user = registeredUsers.find((u: any) => u.id === userId)
    if (!user) return

    const keys = [
      `user_${userId}_favorites`,
      `user_${userId}_recentViews`,
      `user_${userId}_cart`,
      `user_${userId}_activeOrders`,
      `user_${userId}_orderHistory`,
    ]
    keys.forEach((k) => !localStorage.getItem(k) && localStorage.setItem(k, "[]"))

    if (!localStorage.getItem(`user_${userId}_notifications`)) {
      localStorage.setItem(
        `user_${userId}_notifications`,
        JSON.stringify({ email: true, push: true, orderUpdates: true, promotions: true }),
      )
    }
    if (!localStorage.getItem(`user_${userId}_privacy`)) {
      localStorage.setItem(`user_${userId}_privacy`, JSON.stringify({ showProfile: true, showHistory: false }))
    }

    const initialData = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      favorites: [],
      recentViews: [],
      cart: [],
      activeOrders: [],
      orderHistory: [],
    }
    setItemWithRetry(`user_${userId}_basic`, JSON.stringify(initialData))
  } catch (e) {
    console.error("初始化用戶數據時發生錯誤:", e)
  }
}

export function initializeAppData() {
  if (typeof window === "undefined") return
  try {
    cleanupStorage()
    const initIfEmpty = (k: string) => !localStorage.getItem(k) && localStorage.setItem(k, "[]")
    initIfEmpty("registeredUsers")
    initIfEmpty("orders")
    initIfEmpty("news")

    const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
    users.forEach((u: any) => initializeUserData(u.id))

    initializeSyncService()
    startPeriodicSync()
  } catch (e) {
    console.error("初始化應用數據時發生錯誤:", e)
  }
}
