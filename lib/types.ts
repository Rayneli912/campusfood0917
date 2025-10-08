export interface CartItem {
  id: string
  foodItemId: string
  name: string
  price: number
  originalPrice: number
  quantity: number
  image?: string
  storeId: string
  storeName: string
  storeLocation?: string
}

export interface Order {
  id: string
  userId: string
  storeId: string
  storeName: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  createdAt: string
  updatedAt?: string
  cancelledBy?: "user" | "store" | "system"
  cancelReason?: string
  contact?: {
    name: string
    phone: string
    email?: string
  }
  customer?: {
    name: string
    phone: string
  }
  pickupLocation?: string
  completedAt?: string
  cancelledAt?: string
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

export interface RecentViewItem {
  id: string
  name: string
  image: string
  description?: string
  price?: number
  storeId?: string
  storeName?: string
  type?: string
  viewedAt?: string
}

export interface StoreAccount {
  id: string
  storeId: string
  storeName: string
  category: string
  description: string
  location: string
  contact: string
  username: string
  password: string
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

export type OrderStatus = "pending" | "accepted" | "prepared" | "completed" | "cancelled" | "rejected"

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
}
