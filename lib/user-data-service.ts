// 用戶數據服務 - 統一管理用戶行為數據
export class UserDataService {
  // 記錄用戶瀏覽店家
  static recordStoreView(userId: string, store: any) {
    if (typeof window === "undefined") return

    try {
      const key = `recentViews_${userId}`
      const existing = JSON.parse(localStorage.getItem(key) || "[]")

      const storeView = {
        id: `store_${store.id}`,
        name: store.name,
        image: store.coverImage || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(store.name)}`,
        description: store.description,
        storeId: store.id,
        storeName: store.name,
        type: "store",
        category: store.category,
        location: store.location,
        rating: store.rating,
        viewedAt: new Date().toISOString(),
      }

      // 移除重複項目並添加到開頭
      const filtered = existing.filter((item: any) => item.id !== storeView.id)
      const updated = [storeView, ...filtered].slice(0, 20) // 保留最近20項

      localStorage.setItem(key, JSON.stringify(updated))

      // 觸發更新事件
      window.dispatchEvent(new CustomEvent("recentViewsUpdated", { detail: { userId, item: storeView } }))
    } catch (error) {
      console.error("記錄店家瀏覽失敗:", error)
    }
  }

  // 記錄用戶瀏覽商品
  static recordItemView(userId: string, item: any, store: any) {
    if (typeof window === "undefined") return

    try {
      const key = `recentViews_${userId}`
      const existing = JSON.parse(localStorage.getItem(key) || "[]")

      const itemView = {
        id: item.id,
        name: item.name,
        image: item.image,
        description: item.description,
        price: item.discountPrice || item.price,
        originalPrice: item.originalPrice,
        storeId: store.id,
        storeName: store.name,
        type: "item",
        category: item.category,
        viewedAt: new Date().toISOString(),
      }

      // 移除重複項目並添加到開頭
      const filtered = existing.filter((view: any) => view.id !== itemView.id)
      const updated = [itemView, ...filtered].slice(0, 20)

      localStorage.setItem(key, JSON.stringify(updated))

      // 觸發更新事件
      window.dispatchEvent(new CustomEvent("recentViewsUpdated", { detail: { userId, item: itemView } }))
    } catch (error) {
      console.error("記錄商品瀏覽失敗:", error)
    }
  }

  // 添加店家到收藏
  static addStoreToFavorites(userId: string, store: any) {
    if (typeof window === "undefined") return

    try {
      const key = `favorites_${userId}`
      const existing = JSON.parse(localStorage.getItem(key) || "[]")

      const storeFavorite = {
        id: `store_${store.id}`,
        name: store.name,
        image: store.coverImage || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(store.name)}`,
        description: store.description,
        storeId: store.id,
        storeName: store.name,
        type: "store",
        category: store.category,
        location: store.location,
        rating: store.rating,
        addedAt: new Date().toISOString(),
      }

      // 檢查是否已收藏
      const isAlreadyFavorite = existing.some((fav: any) => fav.id === storeFavorite.id)
      if (!isAlreadyFavorite) {
        const updated = [storeFavorite, ...existing]
        localStorage.setItem(key, JSON.stringify(updated))

        // 觸發更新事件
        window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { userId, item: storeFavorite } }))
      }
    } catch (error) {
      console.error("添加店家收藏失敗:", error)
    }
  }

  // 添加商品到收藏
  static addItemToFavorites(userId: string, item: any, store: any) {
    if (typeof window === "undefined") return

    try {
      const key = `favorites_${userId}`
      const existing = JSON.parse(localStorage.getItem(key) || "[]")

      const itemFavorite = {
        id: item.id,
        name: item.name,
        image: item.image,
        description: item.description,
        price: item.discountPrice || item.price,
        originalPrice: item.originalPrice,
        storeId: store.id,
        storeName: store.name,
        type: "item",
        category: item.category,
        addedAt: new Date().toISOString(),
      }

      // 檢查是否已收藏
      const isAlreadyFavorite = existing.some((fav: any) => fav.id === itemFavorite.id)
      if (!isAlreadyFavorite) {
        const updated = [itemFavorite, ...existing]
        localStorage.setItem(key, JSON.stringify(updated))

        // 觸發更新事件
        window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { userId, item: itemFavorite } }))
      }
    } catch (error) {
      console.error("添加商品收藏失敗:", error)
    }
  }

  // 記錄購物車操作
  static recordCartAction(userId: string, action: "add" | "remove" | "update", item: any) {
    if (typeof window === "undefined") return

    try {
      // 觸發購物車更新事件
      window.dispatchEvent(
        new CustomEvent("cartUpdated", {
          detail: { userId, action, item, timestamp: new Date().toISOString() },
        }),
      )
    } catch (error) {
      console.error("記錄購物車操作失敗:", error)
    }
  }

  // 獲取用戶完整數據
  static getUserData(userId: string) {
    if (typeof window === "undefined") return null

    try {
      return {
        favorites: JSON.parse(localStorage.getItem(`favorites_${userId}`) || "[]"),
        recentViews: JSON.parse(localStorage.getItem(`recentViews_${userId}`) || "[]"),
        cart: JSON.parse(localStorage.getItem(`cart_${userId}`) || "[]"),
        orders: this.getUserOrders(userId),
      }
    } catch (error) {
      console.error("獲取用戶數據失敗:", error)
      return null
    }
  }

  // 獲取用戶訂單
  static getUserOrders(userId: string) {
    try {
      const allOrders = JSON.parse(localStorage.getItem("orders") || "[]")
      return allOrders.filter((order: any) => order.userId === userId)
    } catch (error) {
      console.error("獲取用戶訂單失敗:", error)
      return []
    }
  }

  // 初始化測試用戶數據
  static initializeTestUserData() {
    if (typeof window === "undefined") return

    const userId = "user1"

    // 初始化收藏數據（包含店家和商品）
    if (!localStorage.getItem(`favorites_${userId}`)) {
      const sampleFavorites = [
        // 店家收藏
        {
          id: "store_store1",
          name: "小雞好食堂",
          image: "/placeholder.svg?height=200&width=400&text=小雞好食堂",
          description: "提供多種餐點選擇，每日特餐與即期品優惠",
          storeId: "store1",
          storeName: "小雞好食堂",
          type: "store",
          category: "學生餐廳",
          location: "山海樓",
          rating: 4.5,
          addedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "store_store3",
          name: "角落茶食",
          image: "/placeholder.svg?height=200&width=400&text=角落茶食",
          description: "提供咖啡、輕食、甜點，閉店前特價",
          storeId: "store3",
          storeName: "角落茶食",
          type: "store",
          category: "咖啡廳",
          location: "逸仙館前",
          rating: 4.7,
          addedAt: new Date(Date.now() - 172800000).toISOString(),
        },
        // 商品收藏
        {
          id: "store1-item2",
          name: "玉米濃湯",
          image: "/placeholder.svg?height=100&width=100&text=玉米濃湯",
          description: "香濃玉米湯，使用新鮮玉米熬製",
          price: 20,
          originalPrice: 40,
          storeId: "store1",
          storeName: "小雞好食堂",
          type: "item",
          category: "湯品",
          addedAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ]
      localStorage.setItem(`favorites_${userId}`, JSON.stringify(sampleFavorites))
    }

    // 初始化瀏覽記錄（包含店家和商品）
    if (!localStorage.getItem(`recentViews_${userId}`)) {
      const sampleRecentViews = [
        // 店家瀏覽
        {
          id: "store_store2",
          name: "武嶺福利社",
          image: "/placeholder.svg?height=200&width=400&text=武嶺福利社",
          description: "各式飲料、麵包、便當等即期品優惠",
          storeId: "store2",
          storeName: "武嶺福利社",
          type: "store",
          category: "員生企業社",
          location: "學生宿舍區一武嶺二村",
          rating: 4.2,
          viewedAt: new Date(Date.now() - 1800000).toISOString(), // 30分鐘前
        },
        {
          id: "store_store1",
          name: "小雞好食堂",
          image: "/placeholder.svg?height=200&width=400&text=小雞好食堂",
          description: "提供多種餐點選擇，每日特餐與即期品優惠",
          storeId: "store1",
          storeName: "小雞好食堂",
          type: "store",
          category: "學生餐廳",
          location: "山海樓",
          rating: 4.5,
          viewedAt: new Date(Date.now() - 3600000).toISOString(), // 1小時前
        },
        // 商品瀏覽
        {
          id: "store1-item1",
          name: "白飯",
          image: "/placeholder.svg?height=100&width=100&text=白飯",
          description: "香Q米飯，今日特價",
          price: 5,
          originalPrice: 10,
          storeId: "store1",
          storeName: "小雞好食堂",
          type: "item",
          category: "主食",
          viewedAt: new Date(Date.now() - 5400000).toISOString(), // 1.5小時前
        },
        {
          id: "store3-item1",
          name: "拿鐵咖啡",
          image: "/placeholder.svg?height=100&width=100&text=拿鐵咖啡",
          description: "香濃拿鐵咖啡",
          price: 35,
          originalPrice: 45,
          storeId: "store3",
          storeName: "角落茶食",
          type: "item",
          category: "咖啡",
          viewedAt: new Date(Date.now() - 7200000).toISOString(), // 2小時前
        },
      ]
      localStorage.setItem(`recentViews_${userId}`, JSON.stringify(sampleRecentViews))
    }

    // 初始化購物車數據
    if (!localStorage.getItem(`cart_${userId}`)) {
      const sampleCart = [
        {
          id: "cart_item_1",
          foodItemId: "store1-item3",
          name: "炸雞塊",
          price: 35,
          originalPrice: 50,
          quantity: 2,
          image: "/placeholder.svg?height=100&width=100&text=炸雞塊",
          storeId: "store1",
          storeName: "小雞好食堂",
          storeLocation: "山海樓",
        },
        {
          id: "cart_item_2",
          foodItemId: "store2-item1",
          name: "三明治",
          price: 30,
          originalPrice: 60,
          quantity: 1,
          image: "/placeholder.svg?height=100&width=100&text=三明治",
          storeId: "store2",
          storeName: "武嶺福利社",
          storeLocation: "學生宿舍區一武嶺二村",
        },
      ]
      localStorage.setItem(`cart_${userId}`, JSON.stringify(sampleCart))
    }
  }
}
