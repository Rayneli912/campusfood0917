// lib/store-code.ts
/** 001 → store1、002 → store2… ；若本來就傳入 store1 也照樣回傳 store1 */
export function codeToStoreId(idOrCode: string): string {
    const v = String(idOrCode || "").trim()
    if (!v) return ""
    // 已是 storeN
    if (/^store\d+$/.test(v)) return v
    // 三位數代碼
    const m = v.match(/^0*(\d{1,})$/)
    if (m) {
      const n = Number(m[1])
      if (Number.isFinite(n) && n > 0) return `store${n}`
    }
    return v
  }
  
  /** store1 → 001、store2 → 002 */
  export function storeIdToCode(storeId: string): string {
    const m = String(storeId || "").match(/^store(\d+)$/)
    if (!m) return ""
    return String(m[1]).padStart(3, "0")
  }
  