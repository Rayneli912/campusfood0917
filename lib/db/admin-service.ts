/**
 * 管理員服務層
 * 處理管理員相關的資料庫操作
 */

import { supabase } from "@/lib/supabase/client"
import { supabaseAdmin } from "@/lib/supabase/admin"
import bcrypt from "bcryptjs"

// ============================================
// 類型定義
// ============================================

export interface Admin {
  id: string
  username: string
  name: string
  email: string | null
  created_at: string
  updated_at: string
}

export interface AdminWithPassword extends Admin {
  password_hash: string
}

// ============================================
// 管理員服務
// ============================================

export const AdminService = {
  /**
   * 管理員登入
   */
  async login(username: string, password: string): Promise<{
    success: boolean
    message?: string
    admin?: Admin
  }> {
    try {
      // 查詢管理員
      const { data: admin, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .single()

      if (error || !admin) {
        return {
          success: false,
          message: "帳號或密碼錯誤",
        }
      }

      // 驗證密碼
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "帳號或密碼錯誤",
        }
      }

      // 移除密碼 hash
      const { password_hash, ...adminData } = admin

      return {
        success: true,
        admin: adminData as Admin,
      }
    } catch (error) {
      console.error("管理員登入錯誤:", error)
      return {
        success: false,
        message: "登入時發生錯誤",
      }
    }
  },

  /**
   * 獲取管理員資訊
   */
  async getAdmin(adminId: string): Promise<Admin | null> {
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("id, username, name, email, created_at, updated_at")
        .eq("id", adminId)
        .single()

      if (error) {
        console.error("獲取管理員資訊錯誤:", error)
        return null
      }

      return data as Admin
    } catch (error) {
      console.error("獲取管理員資訊錯誤:", error)
      return null
    }
  },

  /**
   * 根據用戶名獲取管理員
   */
  async getAdminByUsername(username: string): Promise<Admin | null> {
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("id, username, name, email, created_at, updated_at")
        .eq("username", username)
        .single()

      if (error) {
        console.error("獲取管理員資訊錯誤:", error)
        return null
      }

      return data as Admin
    } catch (error) {
      console.error("獲取管理員資訊錯誤:", error)
      return null
    }
  },

  /**
   * 更新管理員密碼
   */
  async updatePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // 獲取當前密碼 hash
      const { data: admin, error: fetchError } = await supabaseAdmin
        .from("admins")
        .select("password_hash")
        .eq("id", adminId)
        .single()

      if (fetchError || !admin) {
        return {
          success: false,
          message: "管理員不存在",
        }
      }

      // 驗證當前密碼
      const isPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "當前密碼錯誤",
        }
      }

      // 加密新密碼
      const newPasswordHash = await bcrypt.hash(newPassword, 10)

      // 更新密碼
      const { error: updateError } = await supabaseAdmin
        .from("admins")
        .update({ password_hash: newPasswordHash })
        .eq("id", adminId)

      if (updateError) {
        console.error("更新密碼錯誤:", updateError)
        return {
          success: false,
          message: "更新密碼失敗",
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error("更新密碼錯誤:", error)
      return {
        success: false,
        message: "更新密碼時發生錯誤",
      }
    }
  },
}

