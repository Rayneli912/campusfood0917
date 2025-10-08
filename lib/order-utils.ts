"use client"

/**
 * 訂單編號：order-店家代號-YYYYMMDD-當日序號（001 起）
 * 後援店家代號：store1→001、store2→002、store3→003
 * 新註冊店家代號：從 004 起（見 lib/store-auth.ts 的 generateNewStoreCode）
 */

interface StoreInfo { id: string; storeCode: string }

/** 產生新店家代號（最大 999） */
export function generateNewStoreCode(): string {
  const s = localStorage.getItem("registeredStores")
  if (!s) return "001"
  const stores = JSON.parse(s)
  const max = (Array.isArray(stores) ? stores : [])
    .map((x: any) => parseInt(String(x.storeCode ?? "0"), 10) || 0)
    .reduce((m: number, n: number) => Math.max(m, n), 0)
  const next = max + 1
  if (next > 999) throw new Error("店家代號已達上限（999）")
  return String(next).padStart(3, "0")
}

/** 解析店家代號：registeredStores 優先；找不到則對 store1/2/3 後援 */
function resolveStoreCode(storeId: string): string | null {
  try {
    const s = localStorage.getItem("registeredStores")
    if (s) {
      const stores = JSON.parse(s)
      const hit = (Array.isArray(stores) ? stores : []).find((v: any) => v.id === storeId)
      if (hit?.storeCode) return String(hit.storeCode).padStart(3, "0")
    }
    const m = /^store(\d+)$/.exec(storeId)
    if (m) {
      const num = parseInt(m[1], 10)
      if (num >= 1 && num <= 999) return String(num).padStart(3, "0")
    }
    return null
  } catch { return null }
}

/** 取得當日（台北時區）日期字串 YYYYMMDD */
function taipeiDateStr(d = new Date()) {
  const tzOffsetMin = 8 * 60
  const local = new Date(d.getTime() + (tzOffsetMin - d.getTimezoneOffset()) * 60000)
  const y = local.getUTCFullYear()
  const m = String(local.getUTCMonth() + 1).padStart(2, "0")
  const day = String(local.getUTCDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

/** 同店家、同日下一個序號（001 起），掃 localStorage("orders") */
function nextSeqFor(storeCode: string, dateStr: string): string {
  try {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]")
    let max = 0
    for (const o of (Array.isArray(orders) ? orders : [])) {
      const id = String(o?.id ?? "")
      const parts = id.split("-")
      if (parts.length === 4) {
        const [_p, sc, d, seq] = parts
        if (sc === storeCode && d === dateStr) {
          const n = parseInt(seq, 10)
          if (!Number.isNaN(n)) max = Math.max(max, n)
        }
      }
    }
    return String(max + 1).padStart(3, "0")
  } catch { return "001" }
}

/** 產生訂單編號（同步）：order-店家代號-YYYYMMDD-當日序號 */
export function generateOrderId(storeId: string): string {
  const storeCode = resolveStoreCode(storeId)
  if (!storeCode) throw new Error("找不到店家代號（請確認店家已註冊或 storeId 格式）")
  const dateStr = taipeiDateStr()
  const seq = nextSeqFor(storeCode, dateStr)
  return `order-${storeCode}-${dateStr}-${seq}`
}

/** 暴露給其他模組查代號 */
export function getStoreCode(storeId: string): string | null {
  return resolveStoreCode(storeId)
}
