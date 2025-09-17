"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { storeAccounts } from "@/lib/store-accounts"

// 定義店家帳號類型
export type StoreAccount = {
  id: string
  storeId: string
  storeName: string
  category: string
  description: string
  location: string
  contact: string
  username: string
  password: string
}

// 創建認證上下文
type AuthContextType = {
  account: StoreAccount | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 認證提供者組件
export function StoreAuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<StoreAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // 檢查本地存儲中是否有登錄信息
  useEffect(() => {
    try {
      const storedAccount = localStorage.getItem("storeAccount")
      if (storedAccount) {
        setAccount(JSON.parse(storedAccount))
      }
    } catch (error) {
      console.error("Failed to parse stored store account", error)
      localStorage.removeItem("storeAccount")
    } finally {
      setLoading(false)
    }
  }, [])

  // 登錄函數
  const login = async (username: string, password: string) => {
    try {
      console.log("嘗試登入店家帳號:", username)

      // 從 localStorage 獲取店家帳號
      const storedAccounts = localStorage.getItem("storeAccounts")
      const accounts = storedAccounts ? JSON.parse(storedAccounts) : []

      // 驗證店家帳號
      const account = accounts.find((acc: any) => acc.username === username && acc.password === password)

      if (account) {
        // 檢查帳號是否被停用
        if (account.isDisabled) {
          console.log("店家帳號已被停用:", account.storeName)
          toast({
            title: "登入失敗",
            description: "該帳號已被停用",
            variant: "destructive",
          })
          return false
        }

        console.log("店家帳號驗證成功:", account.storeName)

        // 儲存帳號資訊到狀態和 localStorage
        setAccount(account)
        localStorage.setItem("storeAccount", JSON.stringify(account))

        // 顯示成功訊息
        toast({
          title: "登入成功！",
          description: `歡迎回來，${account.storeName}`,
        })

        return true
      } else {
        console.log("店家帳號驗證失敗")

        // 顯示錯誤訊息
        toast({
          title: "登入失敗",
          description: "帳號或密碼錯誤",
          variant: "destructive",
        })

        return false
      }
    } catch (error) {
      console.error("登入過程中發生錯誤:", error)

      // 顯示錯誤訊息
      toast({
        title: "登入失敗",
        description: "發生錯誤，請稍後再試",
        variant: "destructive",
      })

      return false
    }
  }

  // 登出函數
  const logout = () => {
    setAccount(null)
    localStorage.removeItem("storeAccount")
    router.push("/login?tab=store")
    toast({
      title: "已登出",
      description: "您已成功登出系統",
    })
  }

  return <AuthContext.Provider value={{ account, login, logout, loading }}>{children}</AuthContext.Provider>
}

// 使用認證的自定義Hook
export function useStoreAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useStoreAuth must be used within a StoreAuthProvider")
  }
  return context
}
