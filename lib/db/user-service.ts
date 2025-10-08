// 用戶資料庫服務
import { supabase } from "../supabase/client"
import { supabaseAdmin } from "../supabase/admin"

export interface User {
  id: string
  username: string
  password: string
  name: string
  email?: string | null
  phone: string
  department?: string | null
  student_id?: string | null
  is_disabled: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  user_id: string
  avatar_url?: string | null
  address?: string | null
  notification_settings?: any
  preferences?: any
  created_at: string
  updated_at: string
}

export interface Favorite {
  id: number
  user_id: string
  item_id: string
  item_type: "store" | "product"
  store_id?: string | null
  store_name?: string | null
  name: string
  image_url?: string | null
  price?: number | null
  created_at: string
}

export interface RecentView {
  id: number
  user_id: string
  item_id: string
  item_type: "store" | "product"
  store_id?: string | null
  store_name?: string | null
  name: string
  image_url?: string | null
  price?: number | null
  viewed_at: string
}

export interface CartItem {
  id: number
  user_id: string
  store_id: string
  item_id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
  created_at: string
  updated_at: string
}

export class UserService {
  // ==================== 用戶管理 ====================
  
  // 檢查用戶名是否存在
  static async checkUsernameExists(username: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single()
    
    return !!data && !error
  }

  // 檢查手機號碼是否存在
  static async checkPhoneExists(phone: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single()

      return !!data && !error
    } catch (error) {
      return false
    }
  }

  // 檢查電子郵件是否存在
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .single()

      return !!data && !error
    } catch (error) {
      return false
    }
  }

  // 獲取所有用戶（管理員用）
  static async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("獲取用戶列表錯誤:", error)
      return []
    }
    
    return data as User[]
  }

  // 刪除用戶（管理員用）
  static async deleteUser(userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 刪除用戶相關的所有數據（由於設置了 CASCADE，會自動刪除關聯數據）
      const { error } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", userId)

      if (error) {
        console.error("刪除用戶錯誤:", error)
        return {
          success: false,
          message: "刪除用戶失敗",
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error("刪除用戶錯誤:", error)
      return {
        success: false,
        message: "刪除用戶時發生錯誤",
      }
    }
  }

  // 更新用戶停用狀態
  static async updateUserStatus(userId: string, isDisabled: boolean): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from("users")
        .update({ is_disabled: isDisabled })
        .eq("id", userId)

      if (error) {
        console.error("更新用戶狀態錯誤:", error)
        return {
          success: false,
          message: "更新用戶狀態失敗",
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error("更新用戶狀態錯誤:", error)
      return {
        success: false,
        message: "更新用戶狀態時發生錯誤",
      }
    }
  }

  // 用戶註冊
  static async register(userData: {
    username: string
    password: string
    name: string
    email?: string
    phone: string
    department?: string
    student_id?: string
  }): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      // 檢查用戶名是否已存在
      const exists = await this.checkUsernameExists(userData.username)
      if (exists) {
        return { success: false, message: "此帳號已被使用" }
      }

      // 創建用戶
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert([
          {
            username: userData.username,
            password: userData.password, // 實際應用中應該加密
            name: userData.name,
            email: userData.email || null,
            phone: userData.phone,
            department: userData.department || null,
            student_id: userData.student_id || null,
            is_disabled: false,
          },
        ])
        .select()
        .single()

      if (userError) throw userError

      // 創建用戶個人資料
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert([
          {
            user_id: user.id,
            notification_settings: {
              email: true,
              push: true,
              orderUpdates: true,
              promotions: true,
            },
          },
        ])

      if (profileError) {
        console.error("創建用戶個人資料失敗:", profileError)
      }

      return { success: true, user }
    } catch (error) {
      console.error("用戶註冊失敗:", error)
      return { success: false, message: "註冊時發生錯誤" }
    }
  }

  // 用戶登入
  static async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single()

      if (error || !user) {
        return { success: false, message: "帳號或密碼錯誤" }
      }

      if (user.is_disabled) {
        return { success: false, message: "此帳號已被停用" }
      }

      return { success: true, user }
    } catch (error) {
      console.error("登入失敗:", error)
      return { success: false, message: "登入時發生錯誤" }
    }
  }

  // 獲取用戶資料
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("獲取用戶資料失敗:", error)
      return null
    }
  }


  // 更新用戶資料
  static async updateUser(
    userId: string,
    updates: Partial<User>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("更新用戶資料失敗:", error)
      return false
    }
  }

  // ==================== 我的最愛 ====================

  // 獲取用戶我的最愛
  static async getFavorites(userId: string): Promise<Favorite[]> {
    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取我的最愛失敗:", error)
      return []
    }
  }

  // 添加到我的最愛
  static async addFavorite(favorite: Omit<Favorite, "id" | "created_at">): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_favorites")
        .insert([favorite])

      if (error) throw error
      return true
    } catch (error) {
      console.error("添加我的最愛失敗:", error)
      return false
    }
  }

  // 從我的最愛移除
  static async removeFavorite(userId: string, itemId: string, itemType: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", itemId)
        .eq("item_type", itemType)

      if (error) throw error
      return true
    } catch (error) {
      console.error("移除我的最愛失敗:", error)
      return false
    }
  }

  // ==================== 近期瀏覽 ====================

  // 獲取用戶近期瀏覽
  static async getRecentViews(userId: string, limit: number = 20): Promise<RecentView[]> {
    try {
      const { data, error } = await supabase
        .from("user_recent_views")
        .select("*")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取近期瀏覽失敗:", error)
      return []
    }
  }

  // 添加到近期瀏覽
  static async addRecentView(view: Omit<RecentView, "id" | "viewed_at">): Promise<boolean> {
    try {
      // 先刪除舊的相同項目
      await supabase
        .from("user_recent_views")
        .delete()
        .eq("user_id", view.user_id)
        .eq("item_id", view.item_id)
        .eq("item_type", view.item_type)

      // 插入新記錄
      const { error } = await supabase
        .from("user_recent_views")
        .insert([view])

      if (error) throw error
      return true
    } catch (error) {
      console.error("添加近期瀏覽失敗:", error)
      return false
    }
  }

  // 清空近期瀏覽
  static async clearRecentViews(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_recent_views")
        .delete()
        .eq("user_id", userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("清空近期瀏覽失敗:", error)
      return false
    }
  }

  // ==================== 購物車 ====================

  // 獲取用戶購物車
  static async getCart(userId: string): Promise<CartItem[]> {
    try {
      const { data, error } = await supabase
        .from("user_cart_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取購物車失敗:", error)
      return []
    }
  }

  // 添加到購物車
  static async addToCart(item: Omit<CartItem, "id" | "created_at" | "updated_at">): Promise<boolean> {
    try {
      // 檢查是否已存在
      const { data: existing } = await supabase
        .from("user_cart_items")
        .select("*")
        .eq("user_id", item.user_id)
        .eq("item_id", item.item_id)
        .eq("store_id", item.store_id)
        .single()

      if (existing) {
        // 更新數量
        const { error } = await supabase
          .from("user_cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id)

        if (error) throw error
      } else {
        // 插入新項目
        const { error } = await supabase
          .from("user_cart_items")
          .insert([item])

        if (error) throw error
      }

      return true
    } catch (error) {
      console.error("添加到購物車失敗:", error)
      return false
    }
  }

  // 更新購物車項目數量
  static async updateCartQuantity(
    userId: string,
    itemId: string,
    storeId: string,
    quantity: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_cart_items")
        .update({ quantity })
        .eq("user_id", userId)
        .eq("item_id", itemId)
        .eq("store_id", storeId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("更新購物車數量失敗:", error)
      return false
    }
  }

  // 從購物車移除
  static async removeFromCart(
    userId: string,
    itemId: string,
    storeId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_cart_items")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", itemId)
        .eq("store_id", storeId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("從購物車移除失敗:", error)
      return false
    }
  }

  // 清空購物車
  static async clearCart(userId: string, storeId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from("user_cart_items")
        .delete()
        .eq("user_id", userId)

      if (storeId) {
        query = query.eq("store_id", storeId)
      }

      const { error } = await query

      if (error) throw error
      return true
    } catch (error) {
      console.error("清空購物車失敗:", error)
      return false
    }
  }
}
