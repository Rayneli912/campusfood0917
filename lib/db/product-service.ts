import { supabase } from "@/lib/supabase/client"
import { supabaseAdmin } from "@/lib/supabase/admin"

export interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  original_price: number | null
  discount_price: number
  quantity: number
  expiry_date: string | null
  image_url: string | null
  category: string | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface CreateProductData {
  store_id: string
  name: string
  description?: string
  original_price?: number
  discount_price: number
  quantity: number
  expiry_date?: string
  image_url?: string
  category?: string
}

export interface UpdateProductData {
  name?: string
  description?: string
  original_price?: number
  discount_price?: number
  quantity?: number
  expiry_date?: string
  image_url?: string
  category?: string
  is_available?: boolean
}

export class ProductService {
  // ==================== 商品管理 ====================

  // 創建商品
  static async createProduct(productData: CreateProductData): Promise<{ success: boolean; message?: string; product?: Product }> {
    try {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .insert([productData])
        .select()
        .single()

      if (error) {
        console.error("創建商品錯誤:", error)
        return { success: false, message: "創建商品失敗" }
      }

      return { success: true, product }
    } catch (error) {
      console.error("創建商品錯誤:", error)
      return { success: false, message: "創建商品時發生錯誤" }
    }
  }

  // 獲取店家的所有商品
  static async getStoreProducts(storeId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取店家商品錯誤:", error)
      return []
    }
  }

  // 獲取所有可用商品
  static async getAllAvailableProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取商品列表錯誤:", error)
      return []
    }
  }

  // 獲取單個商品
  static async getProductById(productId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("獲取商品詳情錯誤:", error)
      return null
    }
  }

  // 更新商品
  static async updateProduct(productId: string, updates: UpdateProductData): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from("products")
        .update(updates)
        .eq("id", productId)

      if (error) {
        console.error("更新商品錯誤:", error)
        return { success: false, message: "更新商品失敗" }
      }

      return { success: true }
    } catch (error) {
      console.error("更新商品錯誤:", error)
      return { success: false, message: "更新商品時發生錯誤" }
    }
  }

  // 刪除商品
  static async deleteProduct(productId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from("products")
        .delete()
        .eq("id", productId)

      if (error) {
        console.error("刪除商品錯誤:", error)
        return { success: false, message: "刪除商品失敗" }
      }

      return { success: true }
    } catch (error) {
      console.error("刪除商品錯誤:", error)
      return { success: false, message: "刪除商品時發生錯誤" }
    }
  }

  // 更新商品庫存
  static async updateStock(productId: string, quantity: number): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from("products")
        .update({ quantity })
        .eq("id", productId)

      if (error) {
        console.error("更新庫存錯誤:", error)
        return { success: false, message: "更新庫存失敗" }
      }

      return { success: true }
    } catch (error) {
      console.error("更新庫存錯誤:", error)
      return { success: false, message: "更新庫存時發生錯誤" }
    }
  }

  // 切換商品可用狀態
  static async toggleAvailability(productId: string, isAvailable: boolean): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from("products")
        .update({ is_available: isAvailable })
        .eq("id", productId)

      if (error) {
        console.error("切換商品狀態錯誤:", error)
        return { success: false, message: "切換商品狀態失敗" }
      }

      return { success: true }
    } catch (error) {
      console.error("切換商品狀態錯誤:", error)
      return { success: false, message: "切換商品狀態時發生錯誤" }
    }
  }

  // ==================== 管理員功能 ====================

  // 獲取所有商品（管理員用）
  static async getAllProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("獲取所有商品錯誤:", error)
      return []
    }
  }
}
