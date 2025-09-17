"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useLocalStorage } from "./use-local-storage"
import { getUserByUsername } from "@/lib/data"

// 定義用戶類型
export interface User {
  id: string
  username: string
  name: string
  email: string
  phone: string
}

// 使用認證 Hook
export function useAuth() {
  // 使用 localStorage 存儲用戶資訊
  const [user, setUser] = useLocalStorage<User | null>("user", null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // 初始化用戶數據 - 移到最前面
  const initializeUserData = useCallback(async (userId: string) => {
    try {
      // 確保用戶數據存在
      const cartKey = `cart_${userId}`
      const favoritesKey = `favorites_${userId}`
      const recentViewsKey = `recent-views_${userId}`
      const userOrdersKey = `userOrders_${userId}`
      const activeOrderKey = `activeOrder_${userId}`
      const orderHistoryKey = `orderHistory_${userId}`

      // 檢查並初始化購物車
      if (!localStorage.getItem(cartKey)) {
        localStorage.setItem(cartKey, JSON.stringify([]))
      }

      // 檢查並初始化收藏
      if (!localStorage.getItem(favoritesKey)) {
        localStorage.setItem(favoritesKey, JSON.stringify([]))
      }

      // 檢查並初始化最近瀏覽
      if (!localStorage.getItem(recentViewsKey)) {
        localStorage.setItem(recentViewsKey, JSON.stringify([]))
      }

      // 檢查並初始化訂單列表
      if (!localStorage.getItem(userOrdersKey)) {
        // 從全局訂單列表中獲取該用戶的訂單
        const ordersStr = localStorage.getItem("orders")
        if (ordersStr) {
          const allOrders = JSON.parse(ordersStr)
          const userOrders = allOrders.filter((order: any) => order.userId === userId)
          localStorage.setItem(userOrdersKey, JSON.stringify(userOrders))
        } else {
          localStorage.setItem(userOrdersKey, JSON.stringify([]))
        }
      }

      // 檢查並初始化活動訂單
      if (!localStorage.getItem(activeOrderKey)) {
        // 從用戶訂單列表中獲取活動訂單
        const userOrdersStr = localStorage.getItem(userOrdersKey)
        if (userOrdersStr) {
          const userOrders = JSON.parse(userOrdersStr)
          const activeOrder = userOrders.find(
            (order: any) => !["completed", "cancelled", "rejected"].includes(order.status),
          )
          localStorage.setItem(activeOrderKey, JSON.stringify(activeOrder || null))
        } else {
          localStorage.setItem(activeOrderKey, JSON.stringify(null))
        }
      }

      // 檢查並初始化訂單歷史
      if (!localStorage.getItem(orderHistoryKey)) {
        // 從用戶訂單列表中獲取歷史訂單
        const userOrdersStr = localStorage.getItem(userOrdersKey)
        if (userOrdersStr) {
          const userOrders = JSON.parse(userOrdersStr)
          const historyOrders = userOrders.filter((order: any) =>
            ["completed", "cancelled", "rejected"].includes(order.status),
          )
          localStorage.setItem(orderHistoryKey, JSON.stringify(historyOrders))
        } else {
          localStorage.setItem(orderHistoryKey, JSON.stringify([]))
        }
      }

      // 觸發用戶數據初始化事件
      window.dispatchEvent(new CustomEvent("userDataInitialized", { detail: { userId } }))
    } catch (error) {
      console.error("初始化用戶數據時出錯:", error)
      throw error
    }
  }, [])

  // 初始化 - 檢查是否已登入
  useEffect(() => {
    const init = async () => {
      try {
        // 檢查 localStorage 中是否有用戶資訊
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            // 驗證用戶資訊的完整性
            if (parsedUser && parsedUser.id && parsedUser.username) {
              setUser(parsedUser)
              // 確保用戶數據已初始化
              await initializeUserData(parsedUser.id)
            } else {
              console.error("用戶資訊不完整")
              setUser(null)
              localStorage.removeItem("user")
            }
          } catch (error) {
            console.error("解析用戶資訊時出錯:", error)
            setUser(null)
            localStorage.removeItem("user")
          }
        }
      } catch (error) {
        console.error("初始化用戶認證時出錯:", error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [setUser, initializeUserData])

  // 清除用戶相關數據
  const clearUserData = useCallback((userId: string) => {
    // 不刪除用戶數據，只是登出
    console.log(`用戶 ${userId} 登出，保留用戶數據`)
  }, [])

  // 登入
  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true)
      setError(null)

      try {
        // 模擬 API 請求
        await new Promise((resolve) => setTimeout(resolve, 500))

        // 從資料庫或 API 獲取用戶資訊
        const foundUser = getUserByUsername(username)

        if (foundUser && foundUser.password === password) {
          // 登入成功
          const userInfo: User = {
            id: foundUser.id,
            username: foundUser.username,
            name: foundUser.name,
            email: foundUser.email,
            phone: foundUser.phone,
          }

          // 初始化用戶數據
          await initializeUserData(userInfo.id)

          // 保存用戶資訊到 localStorage
          setUser(userInfo)
          localStorage.setItem("user", JSON.stringify(userInfo))

          // 清除錯誤
          setError(null)
          return true
        } else {
          // 登入失敗
          setError("用戶名或密碼錯誤")
          setUser(null)
          return false
        }
      } catch (error) {
        console.error("登入時出錯:", error)
        setError("登入時出錯，請稍後再試")
        return false
      } finally {
        setLoading(false)
      }
    },
    [setUser, initializeUserData],
  )

  // 登出
  const logout = useCallback(() => {
    if (user) {
      // 保留用戶數據，只清除當前登入狀態
      clearUserData(user.id)
    }

    // 清除用戶資訊
    setUser(null)
    localStorage.removeItem("user")

    // 重定向到登入頁面
    router.push("/login")
  }, [setUser, router, user, clearUserData])

  // 註冊
  const register = useCallback(
    async (userData: { username: string; password: string; name: string; email: string; phone: string }) => {
      setLoading(true)
      setError(null)

      try {
        // 模擬 API 請求
        await new Promise((resolve) => setTimeout(resolve, 500))

        // 檢查用戶名是否已存在
        const existingUser = getUserByUsername(userData.username)
        if (existingUser) {
          setError("用戶名已存在")
          return false
        }

        // 從 localStorage 獲取現有用戶
        const storedUsers = localStorage.getItem("userAccounts")
        const users = storedUsers ? JSON.parse(storedUsers) : []

        // 創建新用戶
        const newUser = {
          id: `user${users.length + 1}`,
          ...userData,
        }

        // 添加到用戶列表
        users.push(newUser)
        localStorage.setItem("userAccounts", JSON.stringify(users))

        // 初始化用戶數據為空
        await initializeUserData(newUser.id)

        // 註冊成功後自動登入
        const userInfo: User = {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
        }

        // 保存用戶資訊到 localStorage
        setUser(userInfo)
        localStorage.setItem("user", JSON.stringify(userInfo))

        return true
      } catch (error) {
        console.error("註冊時出錯:", error)
        setError("註冊時出錯，請稍後再試")
        return false
      } finally {
        setLoading(false)
      }
    },
    [setUser, initializeUserData],
  )

  // 檢查是否已登入
  const isAuthenticated = !!user

  return {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated,
  }
}
