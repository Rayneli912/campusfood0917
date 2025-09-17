"use client"

import type React from "react"
import { StoreAuthProvider } from "@/components/store-auth-provider"

/**
 * 專給 /store/* 用的 Template。
 * 目的：把整個店家端子樹包進 StoreAuthProvider，
 * 讓任何 store 頁面都能安全使用 useStoreAuth()。
 * 不改變你的 UI，僅添加 Context。
 */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <StoreAuthProvider>{children}</StoreAuthProvider>
}
