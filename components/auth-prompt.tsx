"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function AuthPrompt() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onRequire = () => setOpen(true)
    window.addEventListener("app:require-login", onRequire as EventListener)
    return () => window.removeEventListener("app:require-login", onRequire as EventListener)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>登入以取用服務</DialogTitle>
          <DialogDescription>此操作需要帳號。請先註冊或登入後再試一次。</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
          <Link href="/login">
            <Button>註冊/登入</Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
