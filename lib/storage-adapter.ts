// lib/storage-adapter.ts
"use client"

/**
 * 超薄儲存層 Adapter：
 * - 目標：把 localStorage / sessionStorage 的直接操作集中於此。
 * - 未來接後端時，只要在 hooks 內切換走 API（或在此檔提供 backend 實作）即可，UI 無需變動。
 *
 * 設計重點：
 * 1) SSR 安全：在沒有 window 的情況下使用 In-Memory fallback，避免 Next.js RSC/SSR 崩潰。
 * 2) API 盡量貼近 Web Storage，但補上 getJSON/setJSON 與 scanPrefix 方便常見情境。
 * 3) 僅負責存取，不隱含事件廣播（維持由呼叫端決定；避免抽象層過胖）。
 */

type JSONValue = any

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
  readonly length: number
}

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem(key) { return map.has(key) ? map.get(key)! : null },
    setItem(key, value) { map.set(key, String(value)) },
    removeItem(key) { map.delete(key) },
    key(index) { return Array.from(map.keys())[index] ?? null },
    get length() { return map.size },
  }
}

function getNativeStorage(kind: "local" | "session"): StorageLike {
  if (typeof window === "undefined") return createMemoryStorage()
  try {
    const s = kind === "local" ? window.localStorage : window.sessionStorage
    // 探測可寫
    const probeKey = "__storage_probe__"
    s.setItem(probeKey, "1")
    s.removeItem(probeKey)
    return s as unknown as StorageLike
  } catch {
    // Safari 隱私模式 / 第三方情境
    return createMemoryStorage()
  }
}

export interface WrappedStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
  /** 與原生一致的 length 屬性 */
  readonly length: number
  /** 便利方法：讀取 JSON，不存在回傳 fallback */
  getJSON<T = JSONValue>(key: string, fallback: T): T
  /** 便利方法：寫入 JSON（自動 JSON.stringify） */
  setJSON<T = JSONValue>(key: string, value: T): void
  /** 便利方法：根據前綴掃描所有 key（常用於 user/:id/cart:* 等） */
  scanPrefix(prefix: string): Array<{ key: string; value: string | null }>
}

function wrap(storageLike: StorageLike): WrappedStorage {
  return {
    getItem: (k) => storageLike.getItem(k),
    setItem: (k, v) => storageLike.setItem(k, v),
    removeItem: (k) => storageLike.removeItem(k),
    key: (i) => storageLike.key(i),
    get length() { return storageLike.length },
    getJSON<T>(key: string, fallback: T): T {
      const s = storageLike.getItem(key)
      if (s == null) return fallback
      try { return JSON.parse(s) as T } catch { return fallback }
    },
    setJSON<T>(key: string, value: T) {
      try { storageLike.setItem(key, JSON.stringify(value)) }
      catch { /* ignore */ }
    },
    scanPrefix(prefix: string) {
      const out: Array<{ key: string; value: string | null }> = []
      const n = storageLike.length
      for (let i = 0; i < n; i++) {
        const k = storageLike.key(i)
        if (k && k.startsWith(prefix)) {
          out.push({ key: k, value: storageLike.getItem(k) })
        }
      }
      return out
    },
  }
}

/**
 * 預設提供 local / session 兩個命名空間的包裝。
 * 未來若要接後端，可在 hooks 層改走 fetch(API) 實作；或在此檔額外導出 backend 版本並由 env 切換。
 */
export const storage = {
  local: wrap(getNativeStorage("local")),
  session: wrap(getNativeStorage("session")),
}
