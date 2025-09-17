"use client"

import type React from "react"
import { useEffect } from "react"
import { initializeAppData } from "@/lib/sync-service"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeAppData()
  }, [])

  return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
  )
}
