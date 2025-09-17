"use client"

import { useState, useEffect } from "react"

// 通用的 localStorage hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 初始化狀態
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error("Error reading from localStorage:", error)
      return initialValue
    }
  })

  // 監聽變化並更新 localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // 如果值為 null，則移除該項
        if (storedValue === null) {
          window.localStorage.removeItem(key)
        } else {
          window.localStorage.setItem(key, JSON.stringify(storedValue))
        }
      } catch (error) {
        console.error("Error writing to localStorage:", error)
      }
    }
  }, [key, storedValue])

  // 監聽其他頁面的 localStorage 變化
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue
          setStoredValue(newValue)
        } catch (error) {
          console.error("Error parsing storage change:", error)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [key, initialValue])

  return [storedValue, setStoredValue] as const
}
