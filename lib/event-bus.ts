// 事件匯流排 - 用於管理應用中的自定義事件
// 可以確保不同組件間的事件通信更穩定

class EventBus {
  // 監聽事件
  on(event: string, callback: (detail: any) => void): () => void {
    if (typeof window === "undefined") return () => {}

    const handler = (e: CustomEvent) => callback(e.detail)
    window.addEventListener(event, handler as EventListener)

    // 返回取消監聽的函數
    return () => {
      window.removeEventListener(event, handler as EventListener)
    }
  }

  // 一次性監聽事件
  once(event: string, callback: (detail: any) => void): void {
    if (typeof window === "undefined") return

    const handler = (e: CustomEvent) => {
      callback(e.detail)
      window.removeEventListener(event, handler as EventListener)
    }
    window.addEventListener(event, handler as EventListener)
  }

  // 觸發事件
  emit(event: string, detail: any): void {
    if (typeof window === "undefined") return

    const customEvent = new CustomEvent(event, { detail })
    window.dispatchEvent(customEvent)

    // 額外保存到localStorage以實現跨頁面同步
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        `event_${event}`,
        JSON.stringify({
          detail,
          timestamp: Date.now(),
        }),
      )

      // 5秒後清除，避免localStorage堆積
      setTimeout(() => {
        localStorage.removeItem(`event_${event}`)
      }, 5000)
    }
  }

  // 移除所有特定事件的監聽器
  off(event: string): void {
    // 由於瀏覽器無法直接移除所有特定事件的監聽器
    // 這裡提供一個模擬方法 - 觸發一個事件表示要取消所有監聽
    this.emit(`${event}:clear`, null)
  }
}

// 導出單例
export const eventBus = new EventBus()

// 常用事件名稱常量
export const EVENT_TYPES = {
  ORDER_STATUS_UPDATED: "orderStatusUpdated",
  ORDER_COMPLETED: "orderCompleted",
  NEW_ORDER: "newOrder",
  CART_UPDATED: "cartUpdated",
  DATA_INITIALIZED: "dataInitialized",
  STORE_UPDATED: "storeUpdated",
  FOOD_ITEMS_UPDATED: "foodItemsUpdated",
}

// 初始化全局事件監聽
export function initializeEventListeners() {
  if (typeof window === "undefined") return

  // 監聽storage事件實現跨頁面事件通信
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("event_") && e.newValue) {
      try {
        const eventName = e.key.replace("event_", "")
        const data = JSON.parse(e.newValue)

        // 觸發本地事件
        if (data && data.detail) {
          const localEvent = new CustomEvent(eventName, {
            detail: data.detail,
          })
          window.dispatchEvent(localEvent)
        }
      } catch (error) {
        console.error("Error processing cross-page event:", error)
      }
    }
  })

  console.log("全局事件監聽器已初始化")
}
