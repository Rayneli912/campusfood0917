"use client"

import type React from "react"

/**
 * 專給 /store/* 用的 Template。
 * 注意：StoreAuthProvider 已經在 layout.tsx 中提供，
 * 這裡只是透明傳遞 children。
 */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
