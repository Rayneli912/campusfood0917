"use client"

import { useEffect, useState } from "react"
import { useStoreAuth } from "@/components/store-auth-provider"

export default function TestSessionPage() {
  const { account, loading } = useStoreAuth()
  const [sessionData, setSessionData] = useState<any>(null)
  const [cookieData, setCookieData] = useState<string>("")

  useEffect(() => {
    console.log("🔍 测试页面状态:", { loading, account })
  }, [loading, account])

  useEffect(() => {
    // 测试直接调用 session API
    fetch("/api/auth/store/session", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        console.log("📡 Session API 响应:", data)
        setSessionData(data)
      })
      .catch(err => console.error("❌ Session API 错误:", err))

    // 显示 cookies
    setCookieData(document.cookie)
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">店家会话测试</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">useStoreAuth 状态</h2>
          <div>loading: {loading.toString()}</div>
          <div>account: {JSON.stringify(account, null, 2)}</div>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Session API 响应</h2>
          <pre>{JSON.stringify(sessionData, null, 2)}</pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Cookies</h2>
          <div>{cookieData || "(空)"}</div>
        </div>
      </div>
    </div>
  )
}

