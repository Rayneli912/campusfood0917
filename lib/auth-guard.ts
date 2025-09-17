"use client"

export function isUserLoggedIn(): boolean {
  try {
    const raw = localStorage.getItem("user")
    return !!raw
  } catch {
    return false
  }
}

export function promptLogin() {
  // 觸發全域彈窗
  window.dispatchEvent(new CustomEvent("app:require-login"))
}

/** 包裝需要登入的行為；未登入時彈出提示並返回 false */
export function withUserOrPrompt<T>(fn: () => T): T | false {
  if (!isUserLoggedIn()) {
    promptLogin()
    return false
  }
  return fn()
}
