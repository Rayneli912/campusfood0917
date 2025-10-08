// 店家資料庫服務
import { supabase } from "../supabase/client"
import { supabaseAdmin } from "../supabase/admin"

export interface Store {
  id: string
  store_code: string
  username: string
  password: string
  name: string
  description?: string | null
  location: string
  phone?: string | null
  email?: string | null
  category?: string
  business_hours?: string
  cover_image?: string | null
  rating?: number
  is_disabled: boolean
  status: "active" | "inactive" | "suspended"
  created_at: string
  updated_at: string
}

export interface PendingStore {
  id: number
  username: string
  password: string
  name: string
  description?: string | null
  location: string
  phone?: string | null
  email?: string | null
  applied_at: string
}

export interface StoreProduct {
  id: string
  store_id: string
  name: string
  description?: string | null
  price: number
  original_price?: number | null
  quantity: number
  image_url?: string | null
  category?: string
  expiry_date?: string | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface StoreSettings {
  store_id: string
  notifications: any
  display: any
  business_config: any
  created_at: string
  updated_at: string
}

export class StoreService {
  // ==================== 店家管理 ====================

  // 檢查店家帳號是否存在
  static async checkUsernameExists(username: string): Promise<boolean> {
    const { data: registered } = await supabase
      .from("stores")
      .select("id")
      .eq("username", username)
      .single()

    const { data: pending } = await supabase
      .from("pending_stores")
      .select("id")
      .eq("username", username)
      .single()

    return !!(registered || pending)
  }

  // 獲取所有店家（管理員用）
  static async getAllStores(): Promise<Store[]> {
    const { data, error } = await supabaseAdmin
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("獲取店家列表錯誤:", error)
      return []
    }
    
    return data as Store[]
  }

  // 獲取所有待審核店家（管理員用）
  static async getAllPendingStores(): Promise<PendingStore[]> {
    const { data, error } = await supabaseAdmin
      .from("pending_stores")
      .select("*")
      .order("applied_at", { ascending: false })
    
    if (error) {
      console.error("獲取待審核店家列表錯誤:", error)
      return []
    }
    
    return data as PendingStore[]
  }

  // 刪除店家（管理員用）
  static async deleteStore(storeId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 刪除店家相關的所有數據（由於設置了 CASCADE，會自動刪除關聯數據）
      const { error } = await supabaseAdmin
        .from("stores")
        .delete()
        .eq("id", storeId)

      if (error) {
        console.error("刪除店家錯誤:", error)
        return {
          success: false,
          message: "刪除店家失敗",
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error("刪除店家錯誤:", error)
      return {
        success: false,
        message: "刪除店家時發生錯誤",
      }
    }
  }

  // 刪除待審核店家（管理員用）
  static async deletePendingStore(storeId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from("pending_stores")
        .delete()
        .eq("id", storeId)

      if (error) {
        console.error("刪除待審核店家錯誤:", error)
        return {
          success: false,
          message: "刪除待審核店家失敗",
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error("刪除待審核店家錯誤:", error)
      return {
        success: false,
        message: "刪除待審核店家時發生錯誤",
      }
    }
  }

  // 更新店家停用狀態
  static async updateStoreStatus(storeId: string, isDisabled: boolean): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from("stores")
        .update({ is_disabled: isDisabled })
        .eq("id", storeId)

      if (error) {
        console.error("更新店家狀態錯誤:", error)
        return {
          success: false,
          message: "更新店家狀態失敗",
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error("更新店家狀態錯誤:", error)
      return {
        success: false,
        message: "更新店家狀態時發生錯誤",
      }
    }
  }

  // 店家註冊（提交待審核）
  static async submitRegistration(storeData: {
    username: string
    password: string
    name: string
    description?: string
    location: string
    phone?: string
    email?: string
  }): Promise<{ success: boolean; message?: string }> {
    try {
      // 檢查帳號是否已存在
      const exists = await this.checkUsernameExists(storeData.username)
      if (exists) {
        return { success: false, message: "此店家帳號已被使用" }
      }

      // 插入到待審核表
      const { error } = await supabase.from("pending_stores").insert([storeData])

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error("提交店家註冊失敗:", error)
      return { success: false, message: "提交註冊時發生錯誤" }
    }
  }

  // 獲取待審核店家列表（管理員用）
  static async getPendingStores(): Promise<PendingStore[]> {
    try {
      const { data, error } = await supabase
        .from("pending_stores")
        .select("*")
        .order("applied_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取待審核店家列表失敗:", error)
      return []
    }
  }

  // 核准店家註冊（管理員用）
  static async approveStore(
    pendingStoreId: number,
    storeCode?: string
  ): Promise<{ success: boolean; store?: Store; message?: string }> {
    try {
      // 獲取待審核店家資料
      const { data: pending, error: fetchError } = await supabaseAdmin
        .from("pending_stores")
        .select("*")
        .eq("id", pendingStoreId)
        .single()

      if (fetchError || !pending) {
        return { success: false, message: "找不到待審核店家" }
      }

      // ✅ 生成店家代號（000-999，按注册顺序）
      if (!storeCode) {
        const { data: existingStores } = await supabaseAdmin
          .from("stores")
          .select("store_code")
          .order("created_at", { ascending: true })

        let nextNumber = 0
        if (existingStores && existingStores.length > 0) {
          // 找到最大的店家代号
          const maxCode = existingStores
            .map(s => parseInt(s.store_code || "0"))
            .filter(n => !isNaN(n))
            .reduce((max, n) => Math.max(max, n), -1)
          
          nextNumber = maxCode + 1
        }

        // 确保不超过999
        if (nextNumber > 999) {
          return { success: false, message: "店家代號已達上限（999）" }
        }

        storeCode = String(nextNumber).padStart(3, "0")
      }

      // ✅ 同時存儲明文密碼和加密密碼
      const bcrypt = require("bcryptjs")
      const hashedPassword = await bcrypt.hash(pending.password, 10)

      // 創建店家
      const { data: newStore, error: createError } = await supabaseAdmin
        .from("stores")
        .insert([
          {
            store_code: storeCode,
            username: pending.username,
            password: pending.password, // ✅ 明文密碼（測試用）
            password_hash: hashedPassword, // ✅ 加密密碼（登入用）
            name: pending.name,
            description: pending.description,
            location: pending.location,
            phone: pending.phone,
            email: pending.email,
            is_disabled: false,
            status: "active",
          },
        ])
        .select()
        .single()

      if (createError) throw createError

      // 創建店家設定
      await supabaseAdmin.from("store_settings").insert([
        {
          store_id: newStore.id,
          notifications: {
            newOrder: true,
            orderStatus: true,
            systemUpdates: true,
          },
          display: {
            showOutOfStock: false,
            showSoldCount: true,
          },
        },
      ])

      // 刪除待審核記錄
      await supabaseAdmin.from("pending_stores").delete().eq("id", pendingStoreId)

      return { success: true, store: newStore }
    } catch (error) {
      console.error("核准店家失敗:", error)
      return { success: false, message: "核准店家時發生錯誤" }
    }
  }

  // 拒絕店家註冊（管理員用）
  static async rejectStore(pendingStoreId: number): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from("pending_stores")
        .delete()
        .eq("id", pendingStoreId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("拒絕店家註冊失敗:", error)
      return false
    }
  }

  // 店家登入
  static async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; store?: Store; message?: string }> {
    try {
      console.log("🔐 店家登入嘗試:", { username, passwordLength: password.length })

      // ✅ 使用 supabaseAdmin 并先查询所有匹配用户名的店家
      const { data: stores, error } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("username", username)

      console.log("📊 查询结果:", { storesCount: stores?.length, error })

      if (error) {
        console.log("❌ 查询错误:", error)
        return { success: false, message: "帳號或密碼錯誤" }
      }

      if (!stores || stores.length === 0) {
        console.log("❌ 找不到店家:", username)
        return { success: false, message: "帳號或密碼錯誤" }
      }

      // ✅ 精确匹配用户名（防止teststore匹配到teststore1）
      const store = stores.find(s => s.username === username)
      
      if (!store) {
        console.log("❌ 用户名不精确匹配")
        return { success: false, message: "帳號或密碼錯誤" }
      }

      console.log("✅ 找到店家:", { name: store.name, id: store.id, username: store.username })

      // 檢查密碼
      if (store.password !== password) {
        console.log("❌ 密碼錯誤，期望:", store.password, "实际:", password)
        return { success: false, message: "帳號或密碼錯誤" }
      }

      console.log("✅ 密碼正確")

      if (store.is_disabled) {
        console.log("❌ 帳號已被停用")
        return { success: false, message: "此帳號已被停用" }
      }

      if (store.status !== "active") {
        console.log("❌ 帳號未啟用，狀態:", store.status)
        return { success: false, message: "此店家帳號未啟用" }
      }

      console.log("✅ 店家登入成功:", { name: store.name, id: store.id })
      return { success: true, store }
    } catch (error) {
      console.error("❌ 店家登入失敗:", error)
      return { success: false, message: "登入時發生錯誤" }
    }
  }

  // 獲取店家資料
  static async getStoreById(storeId: string): Promise<Store | null> {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("獲取店家資料失敗:", error)
      return null
    }
  }

  // 根據用戶名獲取店家
  static async getStoreByUsername(username: string): Promise<Store | null> {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("username", username)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("根據用戶名獲取店家失敗:", error)
      return null
    }
  }


  // ==================== 商品管理 ====================

  // 獲取店家商品
  static async getStoreProducts(storeId: string): Promise<StoreProduct[]> {
    try {
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取店家商品失敗:", error)
      return []
    }
  }

  // 獲取可用商品（用戶端用）
  static async getAvailableProducts(storeId: string): Promise<StoreProduct[]> {
    try {
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_available", true)
        .gt("quantity", 0)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取可用商品失敗:", error)
      return []
    }
  }

  // 添加商品
  static async addProduct(
    product: Omit<StoreProduct, "id" | "created_at" | "updated_at">
  ): Promise<{ success: boolean; product?: StoreProduct }> {
    try {
      const { data, error } = await supabase
        .from("store_products")
        .insert([product])
        .select()
        .single()

      if (error) throw error
      return { success: true, product: data }
    } catch (error) {
      console.error("添加商品失敗:", error)
      return { success: false }
    }
  }

  // 更新商品
  static async updateProduct(
    productId: string,
    updates: Partial<StoreProduct>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("store_products")
        .update(updates)
        .eq("id", productId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("更新商品失敗:", error)
      return false
    }
  }

  // 刪除商品
  static async deleteProduct(productId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("store_products")
        .delete()
        .eq("id", productId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("刪除商品失敗:", error)
      return false
    }
  }

  // 更新商品庫存
  static async updateProductStock(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("store_products")
        .update({ quantity })
        .eq("id", productId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("更新商品庫存失敗:", error)
      return false
    }
  }

  // ==================== 店家設定 ====================

  // 獲取店家設定
  static async getStoreSettings(storeId: string): Promise<StoreSettings | null> {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("store_id", storeId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("獲取店家設定失敗:", error)
      return null
    }
  }

  // 更新店家設定
  static async updateStoreSettings(
    storeId: string,
    settings: Partial<StoreSettings>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("store_settings")
        .upsert(
          {
            store_id: storeId,
            ...settings,
          },
          { onConflict: "store_id" }
        )

      if (error) throw error
      return true
    } catch (error) {
      console.error("更新店家設定失敗:", error)
      return false
    }
  }
}
