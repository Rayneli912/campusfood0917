// 計數器資料庫服務 - 使用 Supabase
import { supabase } from "./supabase/client"

export interface CounterData {
  views: number
  waste_saved: number
  calc_mode: "manual" | "completedOrders"
  waste_offset: number
  updated_at: string
}

// 獲取計數器數據
export async function getCounters(): Promise<CounterData | null> {
  try {
    const { data, error } = await supabase
      .from("site_counters")
      .select("*")
      .eq("id", 1)
      .single()

    if (error) throw error
    
    return {
      views: data.views,
      waste_saved: data.waste_saved,
      calc_mode: data.calc_mode,
      waste_offset: data.waste_offset,
      updated_at: data.updated_at,
    }
  } catch (error) {
    console.error("Error fetching counters:", error)
    return null
  }
}

// 增加瀏覽次數
export async function incrementViews(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("increment_views")
    
    if (error) {
      // 如果 RPC 不存在，使用傳統方式
      const { data: current } = await supabase
        .from("site_counters")
        .select("views")
        .eq("id", 1)
        .single()
      
      if (current) {
        await supabase
          .from("site_counters")
          .update({ views: current.views + 1 })
          .eq("id", 1)
      }
    }
    
    return true
  } catch (error) {
    console.error("Error incrementing views:", error)
    return false
  }
}

// 更新計數器（管理員用）
export async function updateCounters(data: Partial<CounterData>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("site_counters")
      .update(data)
      .eq("id", 1)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error updating counters:", error)
    return false
  }
}

// 訂閱計數器變更
export function subscribeToCounters(callback: (data: CounterData) => void) {
  const channel = supabase
    .channel("site_counters_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "site_counters",
      },
      async (payload) => {
        const data = await getCounters()
        if (data) callback(data)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

