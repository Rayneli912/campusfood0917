"use client"

import {
  getInventory,
  setInventory,
  setQuantity as invSetQuantity,
  setListed as invSetListed,
  restock as invRestock,
  deduct as invDeduct,
  type InventoryItem as InvItem,
} from "@/lib/inventory-service"

export interface FoodItem {
  id: string
  name: string
  image?: string
  originalPrice?: number
  discountPrice?: number
  price?: number
  quantity: number
  isListed: boolean
  storeId?: string
  category?: string
  description?: string
  expiryTime?: string
}

const FOOD_ITEMS_UPDATED = "foodItemsUpdated"

function broadcastFoodItemsUpdated(storeId: string, items: FoodItem[]) {
  try {
    window.dispatchEvent(new CustomEvent(FOOD_ITEMS_UPDATED, { detail: { storeId, items } }))
  } catch {}
}

function genId(prefix = "prod"): string {
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${rnd}`
}

/** 原始（完整）清單：店家端/管理端使用 */
export async function getFoodItemsByStoreId(storeId: string): Promise<FoodItem[]> {
  return (await getInventory(storeId)) as FoodItem[]
}

/** 公版清單：使用者端使用 → 僅顯示「已上架」且「數量 > 0」 */
export async function getFoodItemsPublicByStoreId(storeId: string): Promise<FoodItem[]> {
  const list = (await getInventory(storeId)) as FoodItem[]
  return (Array.isArray(list) ? list : []).filter((x) => x.isListed && (x.quantity ?? 0) > 0)
}

/** 新增 */
export async function addFoodItem(storeId: string, item: Partial<FoodItem>): Promise<FoodItem[]> {
  const current = (await getInventory(storeId)) as FoodItem[]
  const id = (item.id && String(item.id)) || genId()
  const quantity = Math.max(0, Math.floor(item.quantity ?? 0))
  const isListed = item.isListed ?? quantity > 0

  const toAdd: FoodItem = {
    id,
    name: String(item.name ?? ""),
    image: item.image,
    originalPrice: item.originalPrice,
    discountPrice: item.discountPrice,
    price: typeof item.price === "number" ? item.price : (item.discountPrice ?? item.originalPrice),
    quantity,
    isListed,
    storeId,
    category: item.category,
    description: item.description,
    expiryTime: item.expiryTime,
  }

  const next = [toAdd, ...current]
  await setInventory(storeId, next as InvItem[])
  broadcastFoodItemsUpdated(storeId, next)
  return next
}

/** 更新 */
export async function updateFoodItem(
  storeId: string,
  id: string,
  patch: Partial<FoodItem>
): Promise<FoodItem[]> {
  const current = (await getInventory(storeId)) as FoodItem[]
  const next = current.map((it) => {
    if (String(it.id) !== String(id)) return it
    const quantity = patch.quantity != null ? Math.max(0, Math.floor(patch.quantity)) : it.quantity
    const isListed = patch.isListed != null ? !!patch.isListed : it.isListed
    const originalPrice = patch.originalPrice != null ? patch.originalPrice : it.originalPrice
    const discountPrice = patch.discountPrice != null ? patch.discountPrice : it.discountPrice
    const price =
      patch.price != null
        ? patch.price
        : (discountPrice != null ? discountPrice : originalPrice)
    return {
      ...it,
      ...patch,
      quantity,
      isListed: quantity > 0 ? isListed : false,
      originalPrice,
      discountPrice,
      price,
    }
  })

  await setInventory(storeId, next as InvItem[])
  broadcastFoodItemsUpdated(storeId, next)
  return next
}

/** 刪除 */
export async function deleteFoodItem(storeId: string, id: string): Promise<FoodItem[]> {
  const current = (await getInventory(storeId)) as FoodItem[]
  const next = current.filter((it) => String(it.id) !== String(id))
  await setInventory(storeId, next as InvItem[])
  broadcastFoodItemsUpdated(storeId, next)
  return next
}

/** 上下架 */
export async function setFoodItemListed(storeId: string, id: string, listed: boolean): Promise<FoodItem[]> {
  await invSetListed(storeId, id, listed)
  const list = (await getInventory(storeId)) as FoodItem[]
  broadcastFoodItemsUpdated(storeId, list)
  return list
}

/** 設定數量 */
export async function setFoodItemQuantity(storeId: string, id: string, quantity: number): Promise<FoodItem[]> {
  await invSetQuantity(storeId, id, quantity)
  const list = (await getInventory(storeId)) as FoodItem[]
  broadcastFoodItemsUpdated(storeId, list)
  return list
}

/** 補貨 */
export async function restockFoodItem(storeId: string, id: string, delta: number): Promise<FoodItem[]> {
  await invRestock(storeId, id, delta)
  const list = (await getInventory(storeId)) as FoodItem[]
  broadcastFoodItemsUpdated(storeId, list)
  return list
}

/** 扣庫存 */
export async function deductFoodItem(storeId: string, id: string, delta: number): Promise<FoodItem[]> {
  await invDeduct(storeId, id, delta)
  const list = (await getInventory(storeId)) as FoodItem[]
  broadcastFoodItemsUpdated(storeId, list)
  return list
}
