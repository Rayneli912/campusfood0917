// lib/inventory-service.ts
"use client"

import { storage } from "@/lib/storage-adapter"
import { USE_BACKEND, apiUrl } from "@/lib/env"

/**
 * 此 Service 提供在非 React 環境（如 action、utility）對庫存的統一存取。
 * - 與現有專案相容：localStorage 鍵為 `foodItems_${storeId}`
 * - 欄位相容：quantity / isListed
 * - 後端模式：自動走 fetch API；request 會同送 (quantity/isListed) 與 (stock/isAvailable) 以提高相容性
 * - 廣播事件：inventoryUpdated（{ storeId, items }）
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
  /** 商品到期時間（本地時間），統一為 YYYY-MM-DDTHH:mm:ss 格式 */
  expiryTime?: string
}

function keyForStore(storeId: string) {
  return `foodItems_${storeId}`
}

/** 將任意時間字串正規化為 YYYY-MM-DDTHH:mm:ss（本地時間）；無法解析時回傳 undefined */
function normalizeDateTimeInput(value: any): string | undefined {
  if (typeof value !== "string") return undefined
  let v = value.trim()
  if (!v) return undefined
  // 空白改 T
  v = v.replace(" ", "T")
  // 無秒數時補 :00
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) v = `${v}:00`
  // 若仍非完整格式，嘗試 Date 解析後重組
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) {
    const d = new Date(v)
    if (isNaN(d.getTime())) return undefined
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const mi = String(d.getMinutes()).padStart(2, "0")
    const ss = String(d.getSeconds()).padStart(2, "0")
    v = `${yy}-${mm}-${dd}T${hh}:${mi}:${ss}`
  }
  return v
}

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
    price:
      typeof raw?.price === "number"
        ? raw.price
        : (typeof raw?.discountPrice === "number" ? raw.discountPrice : raw?.originalPrice),
    quantity: Math.max(0, Number.isFinite(quantity) ? quantity : 0),
    isListed: !!isListed,
    expiryTime: normalizeDateTimeInput(raw?.expiryTime),
  }
}

function buildBackendPatch(patch: Partial<InventoryItem>) {
  const out: any = { ...patch }
  if (patch.quantity != null) out.stock = patch.quantity
  if (patch.isListed != null) out.isAvailable = patch.isListed
  return out
}

/** ---- Local 存取 ---- */

function readLocal(storeId: string): InventoryItem[] {
  const arr = storage.local.getJSON<InventoryItem[]>(keyForStore(storeId), [])
  return (Array.isArray(arr) ? arr : []).map(normalizeFromBackend)
}

function writeLocal(storeId: string, items: InventoryItem[]) {
  storage.local.setJSON(keyForStore(storeId), items)
  window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: { storeId, items } }))
}

/** ---- Backend 存取 ---- */

async function fetchBackendList(storeId: string): Promise<InventoryItem[]> {
  const r = await fetch(apiUrl(`/api/stores/${encodeURIComponent(storeId)}/inventory`), { method: "GET" })
  if (!r.ok) throw new Error("fetch inventory failed")
  const data = await r.json()
  const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
  return list.map(normalizeFromBackend)
}

async function patchBackendItem(storeId: string, id: string, patch: Partial<InventoryItem>): Promise<InventoryItem[]> {
  const r = await fetch(apiUrl(`/api/stores/${encodeURIComponent(storeId)}/inventory/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildBackendPatch(patch)),
  })
  if (!r.ok) throw new Error("update inventory failed")
  const updated = await r.json()
  const list = Array.isArray(updated?.items) ? updated.items : (Array.isArray(updated) ? updated : [])
  return list.map(normalizeFromBackend)
}

/** ---- 對外 API ---- */

export async function getInventory(storeId: string): Promise<InventoryItem[]> {
  if (!USE_BACKEND) return readLocal(storeId)
  return await fetchBackendList(storeId)
}

export async function setInventory(storeId: string, items: InventoryItem[]): Promise<void> {
  if (!USE_BACKEND) {
    writeLocal(storeId, items)
    return
  }
  // Backend 常見是整包 PUT；此處維持逐筆 PATCH 示意
  for (const it of items) {
    await patchBackendItem(storeId, it.id, { quantity: it.quantity, isListed: it.isListed, expiryTime: it.expiryTime })
  }
  const fresh = await fetchBackendList(storeId)
  window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: { storeId, items: fresh } }))
}

export async function setQuantity(storeId: string, id: string, quantity: number): Promise<void> {
  const q = Math.max(0, Math.floor(quantity))
  if (!USE_BACKEND) {
    const list = readLocal(storeId).map(it => it.id === id ? { ...it, quantity: q, isListed: q > 0 ? it.isListed : false } : it)
    writeLocal(storeId, list)
    return
  }
  const list = await patchBackendItem(storeId, id, { quantity: q, isListed: q > 0 })
  window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: { storeId, items: list } }))
}

export async function restock(storeId: string, id: string, delta: number): Promise<void> {
  if (!USE_BACKEND) {
    const list = readLocal(storeId).map(it => {
      if (it.id !== id) return it
      const q = Math.max(0, Math.floor((it.quantity ?? 0) + delta))
      return { ...it, quantity: q, isListed: q > 0 ? true : false }
    })
    writeLocal(storeId, list)
    return
  }
  const current = (await getInventory(storeId)).find(i => i.id === id)?.quantity ?? 0
  const q = Math.max(0, Math.floor(current + delta))
  const list = await patchBackendItem(storeId, id, { quantity: q, isListed: q > 0 })
  window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: { storeId, items: list } }))
}

export async function deduct(storeId: string, id: string, delta: number): Promise<void> {
  const d = Math.abs(delta)
  if (!USE_BACKEND) {
    const list = readLocal(storeId).map(it => {
      if (it.id !== id) return it
      const q = Math.max(0, Math.floor((it.quantity ?? 0) - d))
      return { ...it, quantity: q, isListed: q > 0 ? it.isListed : false }
    })
    writeLocal(storeId, list)
    return
  }
  const current = (await getInventory(storeId)).find(i => i.id === id)?.quantity ?? 0
  const q = Math.max(0, Math.floor(current - d))
  const list = await patchBackendItem(storeId, id, { quantity: q, isListed: q > 0 })
  window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: { storeId, items: list } }))
}

export async function setListed(storeId: string, id: string, listed: boolean): Promise<void> {
  if (!USE_BACKEND) {
    const list = readLocal(storeId).map(it => it.id === id ? { ...it, isListed: !!listed } : it)
    writeLocal(storeId, list)
    return
  }
  const list = await patchBackendItem(storeId, id, { isListed: !!listed })
  window.dispatchEvent(new CustomEvent("inventoryUpdated", { detail: { storeId, items: list } }))
}
