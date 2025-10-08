import { format } from "date-fns"
import type { NewsItem } from "@/types"
import { initializeSyncService, startPeriodicSync } from "@/lib/sync-service"

// Define data structures and initial data here
// Example:
interface SalesReport {
  totalSales: number
  totalOrders: number
  items: { name: string; quantity: number; revenue: number }[]
}

export interface Restaurant {
  id: string
  name: string
  description: string
  category: string
  rating: number
  deliveryTime: string
  distance: string
  minimumOrder: number
  deliveryFee: number
  isNew: boolean
  address: string
  phone: string
  email: string
  logo?: string
  banner?: string
  openTime: string
  closeTime: string
  items?: any[]
  isAvailable?: boolean
  location: string
  contact: string
  status?: string
  coverImage?: string
  openingHours?: string
}

export interface FoodItem {
  id: string
  storeId: string
  name: string
  description: string
  originalPrice: number
  discountPrice: number
  image: string
  category: string
  expiryTime: string
  quantity: number
  isListed: boolean
}

export interface StoreAccount {
  id: string
  storeId: string
  username: string
  password: string
  storeName: string
  category: string
  description: string
  location: string
  contact: string
  openingHours?: string
}

export interface UserAccount {
  id: string
  username: string
  password: string
  name: string
  email: string
  phone: string
  department?: string
  createdAt?: string
  status?: "active" | "disabled"
}

// 預設店家資料
export const stores: Restaurant[] = [
  {
    id: "store1",
    name: "小雞好食堂",
    description: "提供多種餐點選擇，每日特餐與即期品優惠",
    category: "學生餐廳",
    rating: 4.5,
    deliveryTime: "25-35 分鐘",
    distance: "0.8 公里",
    minimumOrder: 50,
    deliveryFee: 20,
    isNew: true,
    address: "山海樓",
    phone: "07-525-6585",
    email: "central@example.com",
    openTime: "11:00",
    closeTime: "21:00",
    logo: "/restaurant-logo.png",
    banner: "/restaurant-banner.png",
    isAvailable: true,
    location: "山海樓",
    contact: "07-525-6585",
    status: "active",
    coverImage: "/placeholder.svg?height=200&width=400&text=小雞好食堂",
    openingHours: "週一至週五11:00~14:00 & 16:00~19:00",
  },
  {
    id: "store2",
    name: "武嶺福利社",
    description: "各式飲料、麵包、便當等即期品優惠",
    category: "員生企業社",
    rating: 4.2,
    deliveryTime: "15-20 分鐘",
    distance: "0.5 公里",
    minimumOrder: 30,
    deliveryFee: 15,
    isNew: false,
    address: "學生宿舍區一武嶺二村",
    phone: "07-5252-000#5952",
    email: "convenience@example.com",
    openTime: "07:00",
    closeTime: "23:00",
    logo: "/restaurant-logo.png",
    banner: "/restaurant-banner.png",
    isAvailable: true,
    location: "學生宿舍區一武嶺二村",
    contact: "07-5252-000#5952",
    status: "active",
    coverImage: "/placeholder.svg?height=200&width=400&text=武嶺福利社",
    openingHours: "週一至週五07:00~23:30；週六08:00~13:00；週日17:00~22:00",
  },
  {
    id: "store3",
    name: "角落茶食",
    description: "提供咖啡、輕食、甜點，閉店前特價",
    category: "咖啡廳",
    rating: 4.7,
    deliveryTime: "20-30 分鐘",
    distance: "1.2 公里",
    minimumOrder: 40,
    deliveryFee: 25,
    isNew: false,
    address: "逸仙館前",
    phone: "0976-271-353",
    email: "cafe@example.com",
    openTime: "08:00",
    closeTime: "21:00",
    logo: "/restaurant-logo.png",
    banner: "/restaurant-banner.png",
    isAvailable: true,
    location: "逸仙館前",
    contact: "0976-271-353",
    status: "active",
    coverImage: "/placeholder.svg?height=200&width=400&text=角落茶食",
    openingHours: "週一至週五10:30~18:00；週六/週日11:30~17:00",
  },
]

// 店家帳號資料
export const storeAccounts = [
  {
    id: "1",
    storeId: "store1",
    storeName: "小雞好食堂",
    category: "學生餐廳",
    description: "提供多種餐點選擇，每日特餐與即期品優惠",
    location: "山海樓",
    contact: "07-525-6585",
    username: "store1",
    password: "store1",
  },
  {
    id: "2",
    storeId: "store2",
    storeName: "武嶺福利社",
    category: "員生企業社",
    description: "各式飲料、麵包、便當等即期品優惠",
    location: "學生宿舍區一武嶺二村",
    contact: "07-5252-000#5952",
    username: "store2",
    password: "store2",
  },
  {
    id: "3",
    storeId: "store3",
    storeName: "角落茶食",
    category: "咖啡廳",
    description: "提供咖啡、輕食、甜點，閉店前特價",
    location: "逸仙館前",
    contact: "0976-271-353",
    username: "store3",
    password: "store3",
  },
]

// 預設已預訂項目
export const savedItems = [
  {
    id: "saved1",
    name: "日式咖哩飯",
    price: 45,
    originalPrice: 60,
    image: "/diverse-food-spread.png",
    storeId: "store1",
    storeName: "小雞好食堂",
    quantity: 1,
  },
  {
    id: "saved2",
    name: "玉米濃湯",
    price: 20,
    originalPrice: 30,
    image: "/diverse-food-spread.png",
    storeId: "store1",
    storeName: "小雞好食堂",
    quantity: 2,
  },
]

// 預設商品資料
const defaultProducts = {
  store1: [
    {
      id: "store1-item1",
      storeId: "store1",
      name: "白飯",
      description: "香Q米飯，今日特價",
      originalPrice: 10,
      discountPrice: 5,
      image: "/placeholder.svg?height=100&width=100&text=白飯",
      category: "主食",
      expiryTime: new Date(Date.now() + 3600000).toISOString(), // 1小時後
      quantity: 5,
      isListed: true,
    },
    {
      id: "store1-item2",
      storeId: "store1",
      name: "玉米濃湯",
      description: "香濃玉米湯，使用新鮮玉米熬製",
      originalPrice: 40,
      discountPrice: 20,
      image: "/placeholder.svg?height=100&width=100&text=玉米濃湯",
      category: "湯品",
      expiryTime: new Date(Date.now() + 3600000).toISOString(), // 1小時後
      quantity: 8,
      isListed: true,
    },
    {
      id: "store1-item3",
      storeId: "store1",
      name: "炸雞塊",
      description: "外酥內嫩的炸雞塊",
      originalPrice: 50,
      discountPrice: 35,
      image: "/placeholder.svg?height=100&width=100&text=炸雞塊",
      category: "小吃",
      expiryTime: new Date(Date.now() + 3600000).toISOString(), // 1小時後
      quantity: 10,
      isListed: true,
    },
  ],
  store2: [
    {
      id: "store2-item1",
      storeId: "store2",
      name: "三明治",
      description: "新鮮製作的三明治",
      originalPrice: 60,
      discountPrice: 30,
      image: "/placeholder.svg?height=100&width=100&text=三明治",
      category: "輕食",
      expiryTime: new Date(Date.now() + 3600000).toISOString(), // 1小時後
      quantity: 3,
      isListed: true,
    },
    {
      id: "store2-item2",
      storeId: "store2",
      name: "泡麵",
      description: "各式泡麵",
      originalPrice: 40,
      discountPrice: 20,
      image: "/placeholder.svg?height=100&width=100&text=泡麵",
      category: "主食",
      expiryTime: new Date(Date.now() + 3600000).toISOString(), // 1小時後
      quantity: 5,
      isListed: true,
    },
  ],
  store3: [
    {
      id: "store3-item1",
      storeId: "store3",
      name: "拿鐵咖啡",
      description: "香濃拿鐵咖啡",
      originalPrice: 45,
      discountPrice: 35,
      image: "/placeholder.svg?height=100&width=100&text=拿鐵咖啡",
      category: "咖啡",
      expiryTime: new Date(Date.now() + 3600000).toISOString(), // 1小時後
      quantity: 6,
      isListed: true,
    },
    {
      id: "store3-item2",
      storeId: "store3",
      name: "巧克力鬆餅",
      description: "香甜巧克力鬆餅",
      originalPrice: 60,
      discountPrice: 30,
      image: "/placeholder.svg?height=100&width=100&text=巧克力鬆餅",
      category: "甜點",
      expiryTime: new Date(Date.now() + 3600000).toISOString(), // 1小時後
      quantity: 3,
      isListed: true,
    },
  ],
}

// 預設用戶帳號
export const userAccounts = [
  {
    id: "user1",
    username: "test1234",
    password: "test1234",
    name: "測試用戶",
    email: "test@example.com",
    phone: "0912345678",
    department: "資訊工程系",
    createdAt: new Date().toISOString(),
    status: "active",
  },
]

// 預設訂單資料
const defaultOrders = [
  {
    id: "order-000-20250809-001",
    storeId: "store3",
    storeName: "角落茶食",
    storeCode: "000",
    userId: "test11",
    username: "test11",
    customerInfo: {
      name: "test11",
      phone: "0912345678",
      username: "test11"
    },
    items: [
      {
        id: "1",
        name: "拿鐵咖啡",
        price: 35,
        quantity: 1
      }
    ],
    total: 35,
    status: "completed",
    createdAt: "2025/08/09 17:00",
    acceptedAt: "2025/08/09 17:01",
    preparedAt: "2025/08/09 17:05",
    completedAt: "2025/08/09 17:10"
  },
  {
    id: "order-me3ykgw5",
    storeId: "store2",
    storeName: "武嶺福利社",
    storeCode: "002",
    userId: "test11",
    username: "test11",
    customerInfo: {
      name: "test11",
      phone: "0912345678",
      username: "test11"
    },
    items: [
      {
        id: "2",
        name: "三明治",
        price: 30,
        quantity: 1
      }
    ],
    total: 30,
    status: "completed",
    createdAt: "2025/08/09 15:53",
    acceptedAt: "2025/08/09 15:54",
    preparedAt: "2025/08/09 15:58",
    completedAt: "2025/08/09 16:00"
  },
  {
    id: "order3-2",
    storeId: "store3",
    storeName: "角落茶食",
    storeCode: "003",
    userId: "user1",
    username: "user1",
    customerInfo: {
      name: "user1",
      phone: "0912345678",
      username: "user1"
    },
    items: [
      {
        id: "3",
        name: "拿鐵咖啡",
        price: 35,
        quantity: 2
      }
    ],
    total: 70,
    status: "completed",
    createdAt: "2025/08/02 23:26",
    acceptedAt: "2025/08/02 23:27",
    preparedAt: "2025/08/02 23:30",
    completedAt: "2025/08/02 23:35"
  }
]

// 獲取菜單項目
export const getMenuItems = (storeId: string) => {
  // 先從 localStorage 嘗試獲取
  if (typeof window !== "undefined") {
    const storedFoodItems = localStorage.getItem("foodItems")
    if (storedFoodItems) {
      const parsedItems = JSON.parse(storedFoodItems)
      const storeItems = parsedItems.filter((item: FoodItem) => item.storeId === storeId)
      if (storeItems.length > 0) return storeItems
    }
  }

  // 如果 localStorage 中沒有，則返回預設資料
  return defaultProducts[storeId as keyof typeof defaultProducts] || []
}

// 獲取店家訂單
export const getOrdersByStoreId = (storeId: string) => {
  if (typeof window !== "undefined") {
    const storedOrders = localStorage.getItem("orders")
    if (storedOrders) {
      try {
        const parsedOrders = JSON.parse(storedOrders)
        return parsedOrders.filter((order: any) => order.storeId === storeId)
      } catch (error) {
        console.error("Error parsing stored orders:", error)
        return []
      }
    }
  }

  // 如果 localStorage 中沒有，則返回預設資料
  return orders.filter((order) => order.storeId === storeId) || []
}

// 獲取銷售報表
export const getSalesReportByStoreId = (storeId: string) => {
  // 這是一個示例，實際應用中應該根據訂單數據生成報表
  return {
    storeId: storeId,
    totalSales: 1234,
    totalOrders: 5,
    items: [
      { name: "白飯", quantity: 2, revenue: 10 },
      { name: "玉米濃湯", quantity: 1, revenue: 20 },
    ],
  }
}

// 獲取已發布的新聞
export const getPublishedNews = () => {
  if (typeof window !== "undefined") {
    const storedNews = localStorage.getItem("news")
    if (storedNews) {
      const parsedNews = JSON.parse(storedNews)
      return parsedNews.filter((item: any) => item.isPublished)
    }
  }

  // 不再使用預設新聞
  return []
}

// 修改 initializeData 函數
export const initializeData = () => {
  if (typeof window === "undefined") return
  
  try {
    // 確保必要的存儲空間存在
    if (!localStorage.getItem("registeredUsers")) {
      localStorage.setItem("registeredUsers", "[]")
    }
    if (!localStorage.getItem("orders")) {
      localStorage.setItem("orders", "[]")
    }

    // 初始化新聞資料（不再使用預設數據）
    if (!localStorage.getItem("news")) {
      localStorage.setItem("news", JSON.stringify([]))
    }

    // 初始化同步服務
    initializeSyncService()
    startPeriodicSync()
  } catch (error) {
    console.error("初始化應用數據時發生錯誤:", error)
  }
}

// 新增：獲取所有訂單
export const getAllOrders = () => {
  if (typeof window !== "undefined") {
    const storedOrders = localStorage.getItem("orders")
    if (storedOrders) {
      try {
        return JSON.parse(storedOrders)
      } catch (error) {
        console.error("Error parsing stored orders:", error)
        return []
      }
    }
  }

  // 如果 localStorage 中沒有，則返回預設資料
  return orders
}

// 新增：添加訂單
export const addOrder = (order: any) => {
  if (typeof window !== "undefined") {
    const storedOrders = localStorage.getItem("orders")
    const orders = storedOrders ? JSON.parse(storedOrders) : []

    // 添加新訂單
    orders.push(order)
    localStorage.setItem("orders", JSON.stringify(orders))

    return true
  }
  return false
}

// 新增：更新訂單狀態
export const updateOrderStatus = (orderId: string, status: string, cancelledBy?: string) => {
  if (typeof window !== "undefined") {
    const storedOrders = localStorage.getItem("orders")
    if (!storedOrders) return false

    const orders = JSON.parse(storedOrders)
    const orderIndex = orders.findIndex((order: any) => order.id === orderId)

    if (orderIndex === -1) return false

    // 更新訂單狀態
    orders[orderIndex].status = status
    orders[orderIndex].updatedAt = new Date().toISOString()

    // 如果是取消訂單，記錄取消者
    if (status === "cancelled" && cancelledBy) {
      orders[orderIndex].cancelledBy = cancelledBy
    }

    localStorage.setItem("orders", JSON.stringify(orders))

    return true
  }
  return false
}

// 獲取用戶帳號
export const getUserByUsername = (username: string) => {
  if (typeof window !== "undefined") {
    const storedUsers = localStorage.getItem("registeredUsers")
    if (storedUsers) {
      try {
        const users = JSON.parse(storedUsers)
        return users.find((user: UserAccount) => user.username === username)
      } catch (error) {
        console.error("Error parsing stored users:", error)
      }
    }
  }

  // 如果 localStorage 中沒有，則從預設資料中獲取
  return userAccounts.find((user) => user.username === username)
}

// 獲取用戶訂單
export const getOrdersByUserId = (userId: string) => {
  if (typeof window !== "undefined") {
    const storedOrders = localStorage.getItem("orders")
    if (storedOrders) {
      try {
        const parsedOrders = JSON.parse(storedOrders)
        return parsedOrders.filter((order: any) => order.userId === userId)
      } catch (error) {
        console.error("Error parsing stored orders:", error)
        return []
      }
    }
  }

  // 如果 localStorage 中沒有，則從預設資料中獲取
  return orders.filter((order) => order.userId === userId)
}

// 獲取所有用戶（包含預設和註冊用戶）
export function getAllUsers() {
  try {
    const allUsers = [...userAccounts]

    if (typeof window !== "undefined") {
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      allUsers.push(...registeredUsers)
    }

    return allUsers
  } catch (error) {
    console.error("獲取所有用戶失敗:", error)
    return userAccounts
  }
}

// 獲取所有店家（包含預設和註冊店家）
export function getAllStores() {
  try {
    const allStores = [...stores]

    if (typeof window !== "undefined") {
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      const formattedRegisteredStores = registeredStores.map((store: any) => ({
        id: store.id || store.username,
        name: store.storeName,
        category: store.category || "其他",
        location: store.address,
        contact: store.phone,
        email: store.email,
        description: store.description || "",
        status: store.status || "active",
        createdAt: store.createdAt || new Date().toISOString(),
        openTime: store.openTime || "08:00",
        closeTime: store.closeTime || "21:00",
      }))
      allStores.push(...formattedRegisteredStores)
    }

    return allStores
  } catch (error) {
    console.error("獲取所有店家失敗:", error)
    return stores
  }
}

// 新增用戶管理函數
export function deleteUser(userId: string) {
  try {
    if (typeof window !== "undefined") {
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      const updatedUsers = registeredUsers.filter((user: any) => user.id !== userId)
      localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers))

      // 觸發用戶更新事件
      const event = new CustomEvent("userUpdated")
      window.dispatchEvent(event)
    }
  } catch (error) {
    console.error("刪除用戶失敗:", error)
    throw error
  }
}

export function updateUserStatus(userId: string, status: "active" | "disabled") {
  try {
    if (typeof window !== "undefined") {
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      const updatedUsers = registeredUsers.map((user: any) => {
        if (user.id === userId) {
          return { ...user, status }
        }
        return user
      })
      localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers))

      // 觸發用戶更新事件
      const event = new CustomEvent("userUpdated")
      window.dispatchEvent(event)
    }
  } catch (error) {
    console.error("更新用戶狀態失敗:", error)
    throw error
  }
}

// 新增店家管理函數
export function deleteStore(storeId: string) {
  try {
    if (typeof window !== "undefined") {
      // 刪除註冊店家
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      const updatedStores = registeredStores.filter((store: any) => store.id !== storeId && store.username !== storeId)
      localStorage.setItem("registeredStores", JSON.stringify(updatedStores))

      // 刪除店家商品
      localStorage.removeItem(`foodItems_${storeId}`)

      // 觸發店家更新事件
      const event = new CustomEvent("storeUpdated")
      window.dispatchEvent(event)
    }
  } catch (error) {
    console.error("刪除店家失敗:", error)
    throw error
  }
}

export function updateStoreStatus(storeId: string, status: "active" | "disabled") {
  try {
    // 更新預設店家狀態
    const storeIndex = stores.findIndex((store) => store.id === storeId)
    if (storeIndex !== -1) {
      stores[storeIndex].status = status
    }

    if (typeof window !== "undefined") {
      // 更新註冊店家狀態
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      const updatedStores = registeredStores.map((store: any) => {
        if (store.id === storeId || store.username === storeId) {
          return { ...store, status }
        }
        return store
      })
      localStorage.setItem("registeredStores", JSON.stringify(updatedStores))

      // 觸發店家更新事件
      const event = new CustomEvent("storeUpdated")
      window.dispatchEvent(event)
    }
  } catch (error) {
    console.error("更新店家狀態失敗:", error)
    throw error
  }
}

// 獲取用戶收藏
export function getFavoritesByUserId(userId: string) {
  try {
    if (typeof window !== "undefined") {
      const favorites = JSON.parse(localStorage.getItem(`favorites_${userId}`) || "[]")
      console.log(`獲取用戶 ${userId} 的收藏:`, favorites)
      return favorites
    }
    return []
  } catch (error) {
    console.error("獲取用戶收藏失敗:", error)
    return []
  }
}

// 獲取用戶瀏覽記錄
export function getRecentViewsByUserId(userId: string) {
  try {
    if (typeof window !== "undefined") {
      const recentViews = JSON.parse(localStorage.getItem(`recentViews_${userId}`) || "[]")
      console.log(`獲取用戶 ${userId} 的瀏覽記錄:`, recentViews)
      return recentViews
    }
    return []
  } catch (error) {
    console.error("獲取用戶瀏覽記錄失敗:", error)
    return []
  }
}

// 獲取所有商品的輔助函數
function getAllFoodItems() {
  // 獲取所有店家的商品
  const allItems = []

  // 從預設商品中獲取
  allItems.push(...defaultProducts.store1, ...defaultProducts.store2, ...defaultProducts.store3)

  // 從 localStorage 中獲取各店家的商品
  if (typeof window !== "undefined") {
    const storedFoodItems = localStorage.getItem("foodItems")
    if (storedFoodItems) {
      try {
        const items = JSON.parse(storedFoodItems)
        allItems.push(...items)
      } catch (error) {
        console.error("解析商品資料失敗:", error)
      }
    }
  }

  return allItems
}

// 店家管理相關函數
export function getStoreById(storeId: string) {
  try {
    // 先從預設店家中查找
    const defaultStore = stores.find((store) => store.id === storeId)
    if (defaultStore) {
      const account = storeAccounts.find((acc) => acc.storeId === storeId)
      return {
        ...defaultStore,
        username: account?.username || storeId,
        password: account?.password || "未設定",
      }
    }

    // 從註冊店家中查找
    if (typeof window !== "undefined") {
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      const registeredStore = registeredStores.find((store: any) => store.id === storeId || store.username === storeId)
      if (registeredStore) {
        return {
          id: registeredStore.id || registeredStore.username,
          name: registeredStore.storeName,
          category: registeredStore.category || "其他",
          location: registeredStore.address,
          contact: registeredStore.phone,
          email: registeredStore.email,
          description: registeredStore.description || "",
          status: registeredStore.status || "active",
          createdAt: registeredStore.createdAt || new Date().toISOString(),
          username: registeredStore.username,
          password: registeredStore.password,
          openTime: registeredStore.openTime || "08:00",
          closeTime: registeredStore.closeTime || "21:00",
        }
      }
    }

    return null
  } catch (error) {
    console.error("獲取店家資料失敗:", error)
    return null
  }
}

// 重新定義 getFoodItemsByStoreId 以避免衝突
export function getFoodItemsByStoreId(storeId: string) {
  try {
    if (typeof window !== "undefined") {
      const storedItems = localStorage.getItem(`foodItems_${storeId}`)
      if (storedItems) {
        return JSON.parse(storedItems)
      }
    }

    // 如果沒有存儲的商品，返回預設商品
    const defaultItems = defaultProducts[storeId as keyof typeof defaultProducts] || []

    // 初始化預設商品到 localStorage
    if (typeof window !== "undefined" && defaultItems.length > 0) {
      localStorage.setItem(`foodItems_${storeId}`, JSON.stringify(defaultItems))
    }

    return defaultItems
  } catch (error) {
    console.error("獲取商品資料失敗:", error)
    return []
  }
}

// 重新定義 updateStoreInfo 以避免衝突
export function updateStoreInfo(storeId: string, updateData: any) {
  try {
    // 更新預設店家資料
    const storeIndex = stores.findIndex((store) => store.id === storeId)
    if (storeIndex !== -1) {
      stores[storeIndex] = { ...stores[storeIndex], ...updateData }
    }

    // 更新註冊店家資料
    if (typeof window !== "undefined") {
      const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
      const updatedStores = registeredStores.map((store: any) => {
        if (store.id === storeId || store.username === storeId) {
          return { ...store, ...updateData }
        }
        return store
      })
      localStorage.setItem("registeredStores", JSON.stringify(updatedStores))
    }
  } catch (error) {
    console.error("更新店家資料失敗:", error)
  }
}

// 重新定義 addFoodItem 以避免衝突
export function addFoodItem(foodItem: any) {
  try {
    if (typeof window !== "undefined") {
      const storeId = foodItem.storeId
      const existingItems = JSON.parse(localStorage.getItem(`foodItems_${storeId}`) || "[]")
      existingItems.push(foodItem)
      localStorage.setItem(`foodItems_${storeId}`, JSON.stringify(existingItems))
    }
  } catch (error) {
    console.error("新增商品失敗:", error)
  }
}

// 重新定義 updateFoodItem 以避免衝突
export function updateFoodItem(itemId: string, updateData: any) {
  try {
    if (typeof window !== "undefined") {
      const storeId = updateData.storeId
      const existingItems = JSON.parse(localStorage.getItem(`foodItems_${storeId}`) || "[]")
      const updatedItems = existingItems.map((item: any) => {
        if (item.id === itemId) {
          return { ...item, ...updateData }
        }
        return item
      })
      localStorage.setItem(`foodItems_${storeId}`, JSON.stringify(updatedItems))
    }
  } catch (error) {
    console.error("更新商品失敗:", error)
  }
}

// 重新定義 deleteFoodItem 以避免衝突
export function deleteFoodItem(itemId: string) {
  try {
    if (typeof window !== "undefined") {
      // 需要找到商品所屬的店家
      const allStores = [...stores]
      if (typeof window !== "undefined") {
        const registeredStores = JSON.parse(localStorage.getItem("registeredStores") || "[]")
        allStores.push(...registeredStores.map((store: any) => ({ id: store.id || store.username })))
      }

      for (const store of allStores) {
        const existingItems = JSON.parse(localStorage.getItem(`foodItems_${store.id}`) || "[]")
        const filteredItems = existingItems.filter((item: any) => item.id !== itemId)
        if (filteredItems.length !== existingItems.length) {
          localStorage.setItem(`foodItems_${store.id}`, JSON.stringify(filteredItems))
          break
        }
      }
    }
  } catch (error) {
    console.error("刪除商品失敗:", error)
  }
}

// 重新定義 updateOrderStatus 以避免衝突
export async function updateOrderStatusFn(orderId: string, newStatus: string, updatedBy: string, reason?: string) {
  try {
    if (typeof window !== "undefined") {
      const storedOrders = localStorage.getItem("orders")
      if (storedOrders) {
        const parsedOrders = JSON.parse(storedOrders)
        const updatedOrders = parsedOrders.map((order: any) => {
          if (order.id === orderId) {
            return {
              ...order,
              status: newStatus,
              updatedAt: new Date().toISOString(),
              updatedBy: updatedBy,
              reason: reason,
            }
          }
          return order
        })
        localStorage.setItem("orders", JSON.stringify(updatedOrders))
      }
    }
  } catch (error) {
    console.error("更新訂單狀態失敗:", error)
    throw error
  }
}
