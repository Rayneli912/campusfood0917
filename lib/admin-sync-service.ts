// 管理員後台資料同步服務
export const syncAdminData = () => {
  // 觸發管理員資料更新事件
  if (typeof window !== "undefined") {
    const event = new CustomEvent("adminDataUpdated", {
      detail: { timestamp: Date.now() },
    })
    window.dispatchEvent(event)
  }
}

// 監聽所有資料變更並同步到管理員後台
export const initAdminDataSync = () => {
  if (typeof window !== "undefined") {
    // 監聽訂單狀態更新
    window.addEventListener("orderStatusUpdated", () => {
      syncAdminData()
    })

    // 監聽購物車更新
    window.addEventListener("cartUpdated", () => {
      syncAdminData()
    })

    // 監聽收藏更新
    window.addEventListener("favoritesUpdated", () => {
      syncAdminData()
    })

    // 監聽用戶資料更新
    window.addEventListener("userDataUpdated", () => {
      syncAdminData()
    })

    // 監聽店家資料更新
    window.addEventListener("storeDataUpdated", () => {
      syncAdminData()
    })
  }
}
