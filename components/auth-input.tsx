"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { InputHTMLAttributes } from "react"

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function AuthInput({ className, ...props }: AuthInputProps) {
  // 限制只能輸入英文、數字和半形符號
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const regex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:'",.<>/?\\|`~]*$/
    if (!regex.test(e.key)) {
      e.preventDefault()
    }
  }

  // 處理貼上事件
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedData = e.clipboardData.getData("text")
    const regex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};:'",.<>/?\\|`~]*$/
    if (!regex.test(pastedData)) {
      e.preventDefault()
    }
  }

  return (
    <Input
      {...props}
      onKeyPress={handleKeyPress}
      onPaste={handlePaste}
      inputMode="email"
      spellCheck={false}
      autoCapitalize="none"
      autoCorrect="off"
      className={cn(
        "focus:border-primary focus:ring-1 focus:ring-primary",
        className
      )}
    />
  )
} 