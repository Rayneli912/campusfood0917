"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { storeAccounts } from "@/lib/store-accounts"

// 定義店家帳號類型
export type StoreAccount = {
  id: string
  username: string
  name: string
  description?: string | null
  location: string
  phone?: string | null
  email?: string | null
  is_disabled?: boolean
  created_at?: string
}

// 創建認證上下文
type AuthContextType = {
  store: StoreAccount | null
  account: StoreAccount | null // 保留向後相容
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 認證提供者組件
export function StoreAuthProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<StoreAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // ✅ 从数据库获取会话信息（通过 cookie）
  useEffect(() => {
    let isMounted = true
    
    const loadSession = async () => {
      try {
        console.log("🔄 StoreAuthProvider 初始化，开始加载会话...")
        console.log("📡 调用 /api/auth/store/session...")
        
        const response = await fetch("/api/auth/store/session", {
          credentials: "include", // 包含 cookies
        })
        
        console.log("📥 Provider: Session API 响应状态:", response.status)
        const data = await response.json()
        console.log("📥 Provider: Session API 数据:", data)

        if (!isMounted) {
          console.log("⚠️ Provider: 组件已卸载，忽略响应")
          return
        }

        if (data.success && data.store) {
          const storeWithStoreId = {
            ...data.store,
            storeId: data.store.id,
          }
          setStore(storeWithStoreId)
          console.log("✅ Provider: 載入店家會話成功:", {
            id: storeWithStoreId.id,
            storeId: storeWithStoreId.storeId,
            name: storeWithStoreId.name,
            username: storeWithStoreId.username
          })
        } else {
          console.log("❌ Provider: 没有有效的店家会话")
          setStore(null)
        }
        
        // ✅ 延迟 200ms 再设置 loading = false，确保状态稳定
        await new Promise(resolve => setTimeout(resolve, 200))
        
        if (isMounted) {
          console.log("🏁 Provider: 会话加载完成，设置 loading = false")
          setLoading(false)
        }
      } catch (error) {
        console.error("❌ Provider: 加载店家会话失败:", error)
        if (isMounted) {
          setStore(null)
          // 错误时也延迟设置 loading
          setTimeout(() => {
            if (isMounted) setLoading(false)
          }, 200)
        }
      }
    }

    loadSession()
    
    return () => {
      isMounted = false
      console.log("🔄 Provider: 组件卸载")
    }
  }, [])

  // ✅ 登錄函數（完全基于数据库和 cookie）
  const login = async (username: string, password: string) => {
    try {
      console.log("🔐 嘗試登入店家帳號:", username)

      // 調用登入 API（会设置 cookie）
      const response = await fetch("/api/auth/store/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include", // ✅ 确保包含 cookies
      })

      const result = await response.json()
      console.log("📥 登入 API 响应:", result)

      if (result.success && result.store) {
        console.log("✅ 店家登入成功:", { 
          id: result.store.id, 
          username: result.store.username, 
          name: result.store.name 
        })

        // ✅ 验证返回的username是否匹配
        if (result.store.username !== username) {
          console.error("❌ 用户名不匹配！", {
            输入: username,
            返回: result.store.username
          })
          toast({
            title: "登入失敗",
            description: "系統錯誤，請重試",
            variant: "destructive",
          })
          return false
        }

        // ✅ 添加 storeId 字段以兼容原有代码
        const storeWithStoreId = {
          ...result.store,
          storeId: result.store.id,
        }

        // ✅ 直接设置状态（不使用 localStorage）
        setStore(storeWithStoreId)

        toast({
          title: "登入成功！",
          description: `歡迎回來，${result.store.name}`,
        })

        return true
      } else {
        console.log("❌ 店家登入失敗:", result.message)

        toast({
          title: "登入失敗",
          description: result.message || "帳號或密碼錯誤",
          variant: "destructive",
        })

        return false
      }
    } catch (error) {
      console.error("❌ 登入過程中發生錯誤:", error)

      toast({
        title: "登入失敗",
        description: "發生錯誤，請稍後再試",
        variant: "destructive",
      })

      return false
    }
  }

  // ✅ 登出函數（删除 cookie）
  const logout = async () => {
    try {
      // ✅ 调用 API 删除会话 cookie
      await fetch("/api/auth/store/session", {
        method: "DELETE",
        credentials: "include",
      })
    } catch (error) {
      console.error("登出 API 调用失败:", error)
    }

    setStore(null)
    router.push("/login?tab=store")
    toast({
      title: "已登出",
      description: "您已成功登出系統",
    })
  }

  return (
    <AuthContext.Provider value={{ store, account: store, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// 使用認證的自定義Hook
export function useStoreAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useStoreAuth must be used within a StoreAuthProvider")
  }
  return context
}
