// lib/database-compatibility.ts
"use client"

import type { FavoriteItem, RecentViewItem } from "@/types"

/**
 * 資料庫相容性層
 * 
 * 這個檔案提供了 localStorage 資料結構與未來資料庫 schema 之間的轉換邏輯
 * 確保當切換到後端資料庫時，資料可以無縫遷移
 */

// 當前 localStorage 使用的 key 格式
export const LOCAL_STORAGE_KEYS = {
  favorites: (userId: string) => `user_${userId}_favorites`,
  recentViews: (userId: string) => `user_${userId}_recentViews`,
  cart: (userId: string) => `user_${userId}_cart`,
  user: "user",
  currentUser: "currentUser",
} as const

// 資料庫相容的收藏項目格式
export interface DatabaseFavoriteItem {
  id: string
  userId: string
  itemId: string // 商品或店家的 ID
  itemType: "store" | "product"
  name?: string
  image?: string
  storeId?: string // 如果是商品，記錄所屬店家
  price?: number
  createdAt: string
  updatedAt: string
}

// 資料庫相容的近期瀏覽格式
export interface DatabaseRecentViewItem {
  id: string
  userId: string
  itemId: string
  itemType: "store" | "product"
  name?: string
  image?: string
  storeId?: string
  viewedAt: string
}

/**
 * 將 localStorage 格式的收藏轉換為資料庫格式
 */
export function convertFavoriteToDatabase(
  localItem: FavoriteItem,
  userId: string
): DatabaseFavoriteItem {
  return {
    id: `${userId}_${localItem.type || 'store'}_${localItem.id}`,
    userId,
    itemId: localItem.id,
    itemType: localItem.type || "store",
    name: localItem.name,
    image: localItem.image,
    storeId: localItem.storeId || (localItem.type === "store" ? localItem.id : undefined),
    price: localItem.price,
    createdAt: localItem.addedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 將資料庫格式的收藏轉換為 localStorage 格式
 */
export function convertFavoriteFromDatabase(
  dbItem: DatabaseFavoriteItem
): FavoriteItem {
  return {
    id: dbItem.itemId,
    type: dbItem.itemType,
    name: dbItem.name,
    image: dbItem.image,
    storeId: dbItem.storeId,
    price: dbItem.price,
    addedAt: dbItem.createdAt,
  }
}

/**
 * 將 localStorage 格式的近期瀏覽轉換為資料庫格式
 */
export function convertRecentViewToDatabase(
  localItem: RecentViewItem,
  userId: string
): DatabaseRecentViewItem {
  return {
    id: `${userId}_${localItem.type || 'store'}_${localItem.id}_${Date.now()}`,
    userId,
    itemId: localItem.id,
    itemType: localItem.type || "store",
    name: localItem.name,
    image: localItem.image,
    storeId: localItem.storeId || (localItem.type === "store" ? localItem.id : undefined),
    viewedAt: localItem.viewedAt,
  }
}

/**
 * 將資料庫格式的近期瀏覽轉換為 localStorage 格式
 */
export function convertRecentViewFromDatabase(
  dbItem: DatabaseRecentViewItem
): RecentViewItem {
  return {
    id: dbItem.itemId,
    type: dbItem.itemType,
    name: dbItem.name,
    image: dbItem.image,
    storeId: dbItem.storeId,
    viewedAt: dbItem.viewedAt,
  }
}

/**
 * 資料遷移函數：將 localStorage 資料遷移到資料庫
 * 這個函數在未來切換到後端時使用
 */
export async function migrateFavoritesToDatabase(userId: string): Promise<boolean> {
  try {
    const localKey = LOCAL_STORAGE_KEYS.favorites(userId)
    const localFavorites: FavoriteItem[] = JSON.parse(localStorage.getItem(localKey) || "[]")
    
    if (localFavorites.length === 0) return true
    
    // 轉換格式
    const dbFavorites = localFavorites.map(item => convertFavoriteToDatabase(item, userId))
    
    // TODO: 實際的資料庫 API 呼叫
    // const response = await fetch('/api/migrate/favorites', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, favorites: dbFavorites })
    // })
    // return response.ok
    
    console.log("準備遷移收藏資料:", dbFavorites)
    return true
  } catch (error) {
    console.error("遷移收藏資料失敗:", error)
    return false
  }
}

/**
 * 資料遷移函數：將 localStorage 近期瀏覽遷移到資料庫
 */
export async function migrateRecentViewsToDatabase(userId: string): Promise<boolean> {
  try {
    const localKey = LOCAL_STORAGE_KEYS.recentViews(userId)
    const localRecentViews: RecentViewItem[] = JSON.parse(localStorage.getItem(localKey) || "[]")
    
    if (localRecentViews.length === 0) return true
    
    // 轉換格式
    const dbRecentViews = localRecentViews.map(item => convertRecentViewToDatabase(item, userId))
    
    // TODO: 實際的資料庫 API 呼叫
    // const response = await fetch('/api/migrate/recent-views', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, recentViews: dbRecentViews })
    // })
    // return response.ok
    
    console.log("準備遷移近期瀏覽資料:", dbRecentViews)
    return true
  } catch (error) {
    console.error("遷移近期瀏覽資料失敗:", error)
    return false
  }
}

/**
 * 完整的用戶資料遷移
 */
export async function migrateUserDataToDatabase(userId: string): Promise<boolean> {
  try {
    const results = await Promise.all([
      migrateFavoritesToDatabase(userId),
      migrateRecentViewsToDatabase(userId),
    ])
    
    return results.every(result => result === true)
  } catch (error) {
    console.error("遷移用戶資料失敗:", error)
    return false
  }
}

/**
 * 檢查資料完整性
 */
export function validateDataIntegrity(userId: string): {
  favorites: { valid: boolean; count: number; errors: string[] }
  recentViews: { valid: boolean; count: number; errors: string[] }
} {
  const result = {
    favorites: { valid: true, count: 0, errors: [] as string[] },
    recentViews: { valid: true, count: 0, errors: [] as string[] },
  }
  
  try {
    // 檢查收藏資料
    const favorites: FavoriteItem[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.favorites(userId)) || "[]"
    )
    result.favorites.count = favorites.length
    
    favorites.forEach((item, index) => {
      if (!item.id) {
        result.favorites.errors.push(`收藏項目 ${index} 缺少 ID`)
        result.favorites.valid = false
      }
      if (!item.type) {
        result.favorites.errors.push(`收藏項目 ${index} 缺少類型`)
      }
    })
    
    // 檢查近期瀏覽資料
    const recentViews: RecentViewItem[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.recentViews(userId)) || "[]"
    )
    result.recentViews.count = recentViews.length
    
    recentViews.forEach((item, index) => {
      if (!item.id) {
        result.recentViews.errors.push(`近期瀏覽項目 ${index} 缺少 ID`)
        result.recentViews.valid = false
      }
      if (!item.viewedAt) {
        result.recentViews.errors.push(`近期瀏覽項目 ${index} 缺少瀏覽時間`)
        result.recentViews.valid = false
      }
    })
  } catch (error) {
    result.favorites.valid = false
    result.recentViews.valid = false
    result.favorites.errors.push("無法解析收藏資料")
    result.recentViews.errors.push("無法解析近期瀏覽資料")
  }
  
  return result
}
