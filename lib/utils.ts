import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// 合併 Tailwind 類別的工具函數
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID
export function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

// 格式化價格
export function formatPrice(price: number) {
  return `$${price}`
}

// 格式化貨幣
export function formatCurrency(amount: number) {
  return `$${amount.toLocaleString()}`
}

// 計算折扣百分比
export function calculateDiscount(original: number, discounted: number) {
  const discount = Math.round(((original - discounted) / original) * 100)
  return `${discount}%`
}

// 格式化日期
export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// 格式化時間
export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// 截斷文本
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + "..."
}

// 生成統一格式的訂單ID
export function generateOrderId(storeId: string) {
  // 獲取當前日期
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2) // 取年份後兩位
  const month = (now.getMonth() + 1).toString().padStart(2, "0") // 月份補零
  const day = now.getDate().toString().padStart(2, "0") // 日期補零

  // 獲取當前時間戳的後6位作為唯一標識
  const timestamp = now.getTime().toString().slice(-6)

  // 從 storeId 中提取店家標識（假設 storeId 格式為 "store1", "store2" 等）
  const storeNumber = storeId.replace(/\D/g, "") || "0"

  // 組合訂單ID: 格式為 "ORD-YYMMDD-STORE-TIMESTAMP"
  return `ORD-${year}${month}${day}-${storeNumber}-${timestamp}`
}
