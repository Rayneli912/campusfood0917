"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type AdminAuthContextType = {
  account: string | null
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [account, setAccount] = useState<string | null>(null)

  useEffect(() => {
    // 從 localStorage 中獲取管理員帳號
    const storedAccount = localStorage.getItem("adminAccount")
    if (storedAccount) {
      setAccount(storedAccount)
    }
  }, [])

  const login = async (username: string, password: string) => {
    // 檢查是否為管理員帳號
    if (username === "guard" && password === "guard") {
      localStorage.setItem("adminAccount", username)
      setAccount(username)
      return { success: true, message: "登入成功" }
    }

    return { success: false, message: "帳號或密碼錯誤" }
  }

  const logout = () => {
    localStorage.removeItem("adminAccount")
    setAccount(null)
    router.push("/")  // 跳轉到首頁而非登入頁面
  }

  return <AdminAuthContext.Provider value={{ account, login, logout }}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}
