// lib/store-utils.ts
/** 去掉店名尾端的（001）或 (001)，容忍空白與全形括號 */
export function stripStoreCode(name: string): string {
    return String(name || "").replace(/\s*[（(]\s*\d{3,4}\s*[）)]\s*$/, "");
  }
  
  /** 將路由值統一轉為 storeId：支援 "2" → "store2" / "store2" 原樣 */
  export function toStoreId(v: string): string {
    const s = String(v || "");
    if (/^store\d+$/i.test(s)) return s.toLowerCase();
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) && n > 0 ? `store${n}` : s;
  }
  
  