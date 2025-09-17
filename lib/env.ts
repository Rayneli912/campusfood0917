// lib/env.ts
"use client"

/**
 * 集中讀取 / 驗證前端可用的環境變數，避免在各處直接讀 process.env 造成不一致。
 * 只暴露以 NEXT_PUBLIC_ 開頭的變數（可在瀏覽器端使用）。
 */

function toBool(v: string | undefined, def = false): boolean {
  if (v == null) return def
  return v === "true" || v === "1"
}

export const USE_BACKEND: boolean = toBool(process.env.NEXT_PUBLIC_USE_BACKEND, false)

/** 後端 API Base（可留空，表示相對路徑） */
export const API_BASE_URL: string = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim()

/**
 * 組合 API URL（保證只出現一條 /）：
 * - 若未設定 base，回傳 path（相對路徑）
 * - 自動去除 base 結尾的多餘斜線、path 開頭的多餘斜線
 */
export function apiUrl(path = ""): string {
  if (!API_BASE_URL) return path
  const base = API_BASE_URL.replace(/\/+$/, "")     // 去除結尾連續斜線
  if (!path) return base
  const p = String(path).replace(/^\/+/, "")        // 去除開頭連續斜線
  return `${base}/${p}`
}
