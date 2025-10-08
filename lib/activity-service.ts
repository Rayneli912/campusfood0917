export interface ActivityRecord {
  id: string
  type: "order_created" | "order_cancelled" | "order_completed" | "user_registered" | "store_registered"
  timestamp: string
  userId?: string
  storeId?: string
  orderId?: string
  details: {
    username?: string
    storeName?: string
    orderTotal?: number
    orderItems?: any[]
  }
}

// 活動記錄服務
export class ActivityService {
  private static readonly STORAGE_KEY = "activityRecords"
  private static readonly MAX_RECORDS = 100 // 最多保留100條記錄

  // 獲取所有活動記錄
  static getActivities(): ActivityRecord[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        // 如果沒有活動記錄，初始化一些示例數據
        this.initializeSampleActivities()
        return this.getActivities()
      }

      const activities = JSON.parse(stored)
      // 按時間倒序排列（最新的在前）
      return activities.sort(
        (a: ActivityRecord, b: ActivityRecord) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
    } catch (error) {
      console.error("獲取活動記錄失敗:", error)
      return []
    }
  }

  // 初始化示例活動數據
  static initializeSampleActivities(): void {
    const sampleActivities: ActivityRecord[] = [
      {
        id: "activity_sample_1",
        type: "user_registered",
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1天前
        userId: "user1",
        details: {
          username: "test1234",
        },
      },
      {
        id: "activity_sample_2",
        type: "order_created",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1小時前
        userId: "user1",
        orderId: "order1-1",
        details: {
          username: "test1234",
          orderTotal: 30,
        },
      },
      {
        id: "activity_sample_3",
        type: "order_completed",
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30分鐘前
        userId: "user1",
        orderId: "order1-1",
        details: {
          username: "test1234",
          orderTotal: 30,
        },
      },
    ]

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sampleActivities))
  }

  // 添加活動記錄
  static addActivity(activity: Omit<ActivityRecord, "id" | "timestamp">): void {
    if (typeof window === "undefined") return

    try {
      const activities = this.getActivities()

      const newActivity: ActivityRecord = {
        ...activity,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      }

      activities.unshift(newActivity)

      // 限制記錄數量
      if (activities.length > this.MAX_RECORDS) {
        activities.splice(this.MAX_RECORDS)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activities))

      // 觸發活動更新事件
      window.dispatchEvent(new CustomEvent("activityUpdated", { detail: newActivity }))
    } catch (error) {
      console.error("添加活動記錄失敗:", error)
    }
  }

  // 記錄訂單活動
  static recordOrderActivity(type: "order_created" | "order_cancelled" | "order_completed", order: any): void {
    this.addActivity({
      type,
      userId: order.userId,
      orderId: order.id,
      details: {
        username: order.customer?.name || "未知用戶",
        orderTotal: order.total,
        orderItems: order.items,
      },
    })
  }

  // 記錄用戶註冊活動
  static recordUserRegistration(user: any): void {
    this.addActivity({
      type: "user_registered",
      userId: user.id,
      details: {
        username: user.username,
      },
    })
  }

  // 記錄店家註冊活動
  static recordStoreRegistration(store: any): void {
    this.addActivity({
      type: "store_registered",
      storeId: store.id,
      details: {
        storeName: store.storeName || store.name,
      },
    })
  }

  // 格式化活動描述
  static formatActivityDescription(activity: ActivityRecord): string {
    const time = new Date(activity.timestamp)
      .toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(/\//g, "/")
      .replace(",", "")

    switch (activity.type) {
      case "order_created":
        return `(${time}) 用戶(${activity.details.username}) (成立)訂單 (${activity.orderId?.slice(0, 8)})`
      case "order_cancelled":
        return `(${time}) 用戶(${activity.details.username}) (取消)訂單 (${activity.orderId?.slice(0, 8)})`
      case "order_completed":
        return `(${time}) 用戶(${activity.details.username}) (完成)訂單 (${activity.orderId?.slice(0, 8)})`
      case "user_registered":
        return `(${time}) 用戶 (${activity.details.username}) 註冊成功`
      case "store_registered":
        return `(${time}) 店家 (${activity.details.storeName}) 註冊成功`
      default:
        return `(${time}) 未知活動`
    }
  }

  // 獲取活動圖標
  static getActivityIcon(type: ActivityRecord["type"]): string {
    switch (type) {
      case "order_created":
        return "📝"
      case "order_cancelled":
        return "❌"
      case "order_completed":
        return "✅"
      case "user_registered":
        return "👤"
      case "store_registered":
        return "🏪"
      default:
        return "📋"
    }
  }

  // 清空活動記錄（僅供測試使用）
  static clearActivities(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.STORAGE_KEY)
    window.dispatchEvent(new CustomEvent("activityUpdated"))
  }
}
