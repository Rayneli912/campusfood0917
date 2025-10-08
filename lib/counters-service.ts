"use client"

/**
 * 站點計數器服務（升級版）
 * - 模式：
 *   - manual：wasteSaved 純手動維護（舊行為）
 *   - completedOrders：顯示 = 完成訂單數 + wasteOffset
 * - 本地開發以 localStorage 為準；未來可接後端（保留 API）
 * - 跨分頁同步：storage 事件 + 自訂事件 "counters-updated"
 */

export type WasteMode = "manual" | "completedOrders"

export type SiteCounters = {
  /** 網站瀏覽人數（次）*/
  views: number
  /** 顯示值：如果是 manual＝手動數值；如果是 completedOrders＝完成訂單數 + wasteOffset */
  wasteSaved: number
  /** 模式（預設 manual）*/
  calcMode?: WasteMode
  /** 偏移量：僅在 completedOrders 模式下生效（顯示值 = 完成訂單數 + wasteOffset）*/
  wasteOffset?: number
  /** 最新更新時間 */
  updatedAt: string
}

const KEY = "siteCounters"
export const COUNTERS_UPDATED = "counters-updated"

// 預設值
const DEFAULT: SiteCounters = {
  views: 0,
  wasteSaved: 0,
  calcMode: "manual",
  wasteOffset: 0,
  updatedAt: new Date().toISOString(),
}

/** 讀取本地 orders 完成訂單數量 */
function getCompletedOrdersCount(): number {
  try {
    const raw = localStorage.getItem("orders")
    if (!raw) return 0
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return 0
    return arr.filter((o: any) => String(o.status) === "completed").length
  } catch {
    return 0
  }
}

/** 讀取（包含缺省回填）*/
function readLocal(): SiteCounters {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const data = JSON.parse(raw)
    const base: SiteCounters = {
      views: Number(data.views) || 0,
      wasteSaved: Number(data.wasteSaved) || 0,
      calcMode: (data.calcMode as WasteMode) || "manual",
      wasteOffset: Number(data.wasteOffset) || 0,
      updatedAt: data.updatedAt || new Date().toISOString(),
    }
    // 若為自動模式，顯示值 = 完成訂單數 + 偏移量
    if (base.calcMode === "completedOrders") {
      base.wasteSaved = getCompletedOrdersCount() + (base.wasteOffset || 0)
    }
    return base
  } catch {
    return { ...DEFAULT }
  }
}

/** 以統一邏輯寫回 + 廣播 */
function writeLocal(next: SiteCounters) {
  const persisted: SiteCounters = { ...next }
  // 以目前模式算出顯示值（確保儲存與廣播時是最新值）
  if (persisted.calcMode === "completedOrders") {
    persisted.wasteSaved = getCompletedOrdersCount() + (persisted.wasteOffset || 0)
  } else {
    persisted.wasteSaved = Number(persisted.wasteSaved) || 0
  }
  persisted.updatedAt = new Date().toISOString()

  localStorage.setItem(KEY, JSON.stringify(persisted))
  // 廣播給同頁元件
  window.dispatchEvent(new CustomEvent(COUNTERS_UPDATED, { detail: persisted }))
  // 觸發跨分頁 storage 同步
  localStorage.setItem(`${KEY}:__touch__`, String(Date.now()))
}

/** 取得計數器（本地）*/
export function getCounters(): SiteCounters {
  return readLocal()
}

/** 覆寫（後台使用）*/
export function setCounters(next: Partial<SiteCounters>): SiteCounters {
  const cur = readLocal()
  // 如果在自動模式，傳入的 wasteSaved 視為「目標顯示值」，轉成 offset 儲存
  let wasteOffset = cur.wasteOffset || 0
  let wasteSaved = cur.wasteSaved
  if (typeof next.wasteSaved !== "undefined") {
    if ((cur.calcMode || "manual") === "completedOrders") {
      const completed = getCompletedOrdersCount()
      wasteOffset = Math.max(0, Number(next.wasteSaved) - completed)
    } else {
      wasteSaved = Math.max(0, Number(next.wasteSaved) || 0)
    }
  }

  const merged: SiteCounters = {
    views: Number(next.views ?? cur.views) || 0,
    wasteSaved,
    calcMode: (next.calcMode as WasteMode) ?? (cur.calcMode || "manual"),
    wasteOffset,
    updatedAt: new Date().toISOString(),
  }
  writeLocal(merged)
  return merged
}

/** 重置（後台使用）*/
export function resetCounters(): SiteCounters {
  const cur = readLocal()
  const fresh: SiteCounters = {
    views: 0,
    wasteSaved: 0,
    calcMode: cur.calcMode || "manual",
    wasteOffset: 0, // 自動模式也重置偏移量
    updatedAt: new Date().toISOString(),
  }
  writeLocal(fresh)
  return fresh
}

/** 只在首頁「這次進站」+1 一次 */
export function incrementViewsOncePerVisit() {
  try {
    if (typeof window === "undefined") return
    const FLAG = "siteCounters:viewCounted"
    if (sessionStorage.getItem(FLAG)) return
    sessionStorage.setItem(FLAG, "1")
    const cur = readLocal()
    cur.views = (cur.views || 0) + 1
    writeLocal(cur)
  } catch {}
}

/** 手動調整（後台使用）*/
export function bumpViews(delta = 1) {
  const cur = readLocal()
  cur.views = Math.max(0, (cur.views || 0) + Number(delta))
  writeLocal(cur)
  return cur
}

/** 手動調整「浪費次數」：
 * - manual：直接加在 wasteSaved
 * - completedOrders：改為調整 wasteOffset
 */
export function bumpWaste(delta = 1) {
  const cur = readLocal()
  if ((cur.calcMode || "manual") === "completedOrders") {
    cur.wasteOffset = Math.max(0, (cur.wasteOffset || 0) + Number(delta))
  } else {
    cur.wasteSaved = Math.max(0, (cur.wasteSaved || 0) + Number(delta))
  }
  writeLocal(cur)
  return cur
}

/** 切換模式 */
export function setWasteMode(mode: WasteMode) {
  const cur = readLocal()
  const next: SiteCounters = { ...cur, calcMode: mode }
  // 切到自動模式時，直接把目前顯示值轉成「完成筆數 + 偏移量」，維持現況
  if (mode === "completedOrders") {
    const completed = getCompletedOrdersCount()
    next.wasteOffset = Math.max(0, (cur.wasteSaved || 0) - completed)
  }
  writeLocal(next)
}

/** 只改偏移量（自動模式） */
export function setWasteOffset(offset: number) {
  const cur = readLocal()
  const next = { ...cur, wasteOffset: Math.max(0, Number(offset) || 0) }
  writeLocal(next)
}

/** 初始化（第一次無資料時建立）*/
export function ensureCountersInitialized() {
  if (!localStorage.getItem(KEY)) {
    writeLocal({ ...DEFAULT })
  }
}

/** 監聽訂單事件，於自動模式時即時更新顯示值 */
export function initCountersAutoSync() {
  if (typeof window === "undefined") return
  const refreshIfAuto = () => {
    const cur = readLocal()
    if ((cur.calcMode || "manual") === "completedOrders") {
      // 觸發重算與廣播
      writeLocal(cur)
    }
  }
  const EVENTS = [
    "orderCreated",
    "orderUpdated",
    "orderStatusChanged",
    "orderStatusUpdated", // 有些頁面使用了這個字串
    "storage",
  ] as const

  EVENTS.forEach((name) => {
    if (name === "storage") {
      window.addEventListener("storage", (e) => {
        if (e.key === "orders") refreshIfAuto()
      })
    } else {
      window.addEventListener(name, refreshIfAuto)
    }
  })
}

// 供未來接後端時擴充的保留點（目前不啟用）
export async function syncCountersWithBackend(_force = false) {
  // TODO: 佈署後以 API 讀寫，並以 setCounters 寫回
}
