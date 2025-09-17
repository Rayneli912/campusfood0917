"use client"

import type React from "react"
import { Toaster } from "@/components/ui/toaster"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AdminAuthProvider } from "@/components/admin-auth-provider"
import { AdminNav } from "@/components/admin-nav"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const adminAccount = localStorage.getItem("adminAccount")

    if (!adminAccount) {
      router.push("/login")
    } else {
      setIsLoading(false)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <AdminAuthProvider>
      <div className="min-h-screen">
        <AdminNav />
        <main className="pb-20 md:pb-0">
          {children}
        </main>
        <Toaster />
      </div>
    </AdminAuthProvider>
  )
}