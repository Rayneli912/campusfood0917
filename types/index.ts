// 用戶基本資料介面
export interface UserBasicData {
  id: string
  username: string
  password: string
  name: string
  email: string
  phone: string
  studentId?: string
  department?: string
  avatar?: string
  createdAt: string
  lastLoginAt?: string
  isDisabled: boolean
  notificationSettings: {
    email: boolean
    push: boolean
    orderUpdates: boolean
    promotions: boolean
  }
  privacySettings: {
    showProfile: boolean
    showHistory: boolean
  }
}

// 用戶完整資料介面
export interface UserFullData extends UserBasicData {
  favorites: FavoriteItem[]
  recentViews: RecentViewItem[]
  cart: CartItem[]
  activeOrders: Order[]
  orderHistory: Order[]
}

// 收藏項目介面（與資料庫 schema 相容）
export interface FavoriteItem {
  id: string
  type?: "product" | "store"
  name?: string
  image?: string
  storeId?: string
  price?: number
  addedAt?: string // 為資料庫相容性保留
}

// 近期瀏覽項目介面（與資料庫 schema 相容）
export interface RecentViewItem {
  id: string
  type?: "product" | "store"
  name?: string
  image?: string
  storeId?: string
  viewedAt: string
}

// 購物車項目介面
export interface CartItem {
  id: string
  name: string
  store: string
  price: number
  quantity: number
  addedAt: string
}

// 訂單介面
export interface Order {
  id: string
  userId: string
  store: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  createdAt: string
  updatedAt: string
  updatedBy?: string
  acceptedAt?: string
  preparedAt?: string
  completedAt?: string
  cancelledAt?: string
  cancelReason?: string
}

// 訂單項目介面
export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

// 訂單狀態類型
export type OrderStatus = "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected"

// 事件名稱類型
export type EventName = 
  | "store-data-updated"
  | "product-data-updated"
  | "order-data-updated"
  | "user-data-updated"
  | "news-data-updated"
  | "favorites-updated"
  | "recent-views-updated"
  | "cart-updated"

// 事件處理器類型
export type EventHandler = (eventName: EventName, data: any) => void 

// 新聞項目介面
export interface NewsItem {
  id: string
  title: string // 對應地點
  content: string // 對應物品
  date: string
  source: string
  isPublished: boolean
  createdAt: string
  updatedAt: string
  publishedAt?: string
  images?: string[] // 支持多張照片URL
  image_url?: string | null // 兼容現有的單張照片字段
  
  // 新增欄位對應 LINE Bot 格式
  location?: string // 地點（與 title 相同，保持兼容性）
  quantity?: string // 數量（支持任意文本）
  deadline?: string // 領取期限
  note?: string // 備註
  post_token_hash?: string // 貼文代碼雜湊
  token_expires_at?: string // 代碼過期時間
} 