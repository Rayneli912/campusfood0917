"use client"

import { generateNewStoreCode } from "./order-utils"

// 預設店家資料
const defaultStores = [
  {
    id: "store1",
    storeCode: "001",
    username: "store1",
    password: "store1",
    name: "小雞好食堂",
    location: "山海樓",
    description: "提供多種餐點選擇，每日特餐與即期品優惠",
    businessHours: "週一至週五11:00~14:00 & 16:00~19:00",
    phone: "07-525-6585",
    email: "store1@example.com",
    isDisabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "store2",
    storeCode: "002",
    username: "store2",
    password: "store2",
    name: "武嶺福利社",
    location: "學生宿舍區一武嶺二村",
    description: "各式飲料、麵包、便當等即期品優惠",
    businessHours: "週一至週五07:00~23:30；週六08:00~13:00；週日17:00~22:00",
    phone: "07-5252-000#5952",
    email: "store2@example.com",
    isDisabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "store3",
    storeCode: "003",
    username: "store3",
    password: "store3",
    name: "角落茶食",
    location: "逸仙館前",
    description: "提供咖啡、輕食、甜點，閉店前特價",
    businessHours: "週一至週五10:30~18:00；週六/週日11:30~17:00",
    phone: "0976-271-353",
    email: "store3@example.com",
    isDisabled: false,
    createdAt: new Date().toISOString(),
  },
]

export interface StoreInfo {
  id: string
  storeCode: string // 店家代號（系統指派，不可更改）
  username: string  // 店家帳號（可更改）
  password: string
  name: string      // 店家名稱（可更改）
  location: string
  description?: string
  businessHours?: string
  phone?: string
  email?: string
  isDisabled: boolean
  createdAt: string
  updatedAt?: string
}

// 初始化店家資料
function initializeStores() {
  const storesStr = localStorage.getItem("registeredStores")
  if (!storesStr) {
    localStorage.setItem("registeredStores", JSON.stringify(defaultStores))
  }
}

// 店家註冊
export async function registerStore(storeData: {
  username: string   // 店家帳號
  password: string
  name: string      // 店家名稱
  location: string
  description?: string
  businessHours?: string
  phone?: string
  email?: string
}) {
  try {
    // 確保有初始化店家資料
    initializeStores()

    // 檢查店家帳號是否已存在
    const storesStr = localStorage.getItem("registeredStores")
    const stores = storesStr ? JSON.parse(storesStr) : []
    
    if (stores.some((store: StoreInfo) => store.username === storeData.username)) {
      throw new Error("店家帳號已存在")
    }

    // 生成店家代號（系統指派，依註冊順序）
    const storeCode = generateNewStoreCode()

    // 創建新店家
    const newStore: StoreInfo = {
      id: `store${stores.length + 1}`,
      storeCode,     // 店家代號（系統指派）
      username: storeData.username, // 店家帳號
      password: storeData.password,
      name: storeData.name, // 店家名稱
      location: storeData.location,
      description: storeData.description,
      businessHours: storeData.businessHours,
      phone: storeData.phone,
      email: storeData.email,
      isDisabled: false,
      createdAt: new Date().toISOString(),
    }

    // 添加到店家列表
    stores.push(newStore)
    localStorage.setItem("registeredStores", JSON.stringify(stores))

    // 初始化店家數據
    localStorage.setItem(`store_${newStore.id}_products`, JSON.stringify([]))
    localStorage.setItem(`store_${newStore.id}_orders`, JSON.stringify([]))
    localStorage.setItem(`store_${newStore.id}_settings`, JSON.stringify({
      notifications: {
        newOrder: true,
        orderStatus: true,
        systemUpdates: true,
      },
      display: {
        showOutOfStock: false,
        showSoldCount: true,
      }
    }))

    // 觸發店家註冊事件
    const event = new CustomEvent("storeRegistered", { detail: newStore })
    window.dispatchEvent(event)

    return {
      success: true,
      store: {
        id: newStore.id,
        storeCode: newStore.storeCode, // 店家代號
        username: newStore.username,    // 店家帳號
        name: newStore.name,           // 店家名稱
        location: newStore.location,
      },
    }
  } catch (error) {
    console.error("Error registering store:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "註冊失敗",
    }
  }
}

// 店家登入（使用店家帳號）
export async function loginStore(username: string, password: string) {
  try {
    // 確保有初始化店家資料
    initializeStores()

    const storesStr = localStorage.getItem("registeredStores")
    if (!storesStr) {
      throw new Error("找不到店家資料")
    }

    const stores: StoreInfo[] = JSON.parse(storesStr)
    // 使用店家帳號（username）和密碼進行登入驗證
    const store = stores.find(s => s.username === username && s.password === password)

    if (!store) {
      throw new Error("店家帳號或密碼錯誤")
    }

    if (store.isDisabled) {
      throw new Error("此店家帳號已被停用")
    }

    // 保存登入狀態
    const storeSession = {
      id: store.id,
      storeId: store.id,
      storeCode: store.storeCode,
      username: store.username,
      name: store.name,
      location: store.location,
      description: store.description,
      businessHours: store.businessHours,
      phone: store.phone,
      email: store.email,
    }
    localStorage.setItem("storeAccount", JSON.stringify(storeSession))

    return {
      success: true,
      store: storeSession,
    }
  } catch (error) {
    console.error("Error logging in store:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "登入失敗",
    }
  }
}

// 更新店家資料（店家代號不可更改）
export async function updateStoreInfo(storeId: string, updateData: {
  username?: string   // 店家帳號可更改
  password?: string
  name?: string      // 店家名稱可更改
  location?: string
  description?: string
  businessHours?: string
  phone?: string
  email?: string
}) {
  try {
    // 確保有初始化店家資料
    initializeStores()

    // 檢查登入狀態
    const storeAccountStr = localStorage.getItem("storeAccount")
    if (!storeAccountStr) {
      throw new Error("請先登入")
    }
    const storeAccount = JSON.parse(storeAccountStr)

    // 獲取所有店家資料
    const storesStr = localStorage.getItem("registeredStores")
    if (!storesStr) {
      throw new Error("找不到店家資料")
    }

    const stores: StoreInfo[] = JSON.parse(storesStr)
    
    // 使用多個條件查找店家
    const storeIndex = stores.findIndex(s => 
      s.id === storeAccount.id || 
      s.id === storeId || 
      s.username === storeAccount.username
    )

    if (storeIndex === -1) {
      console.error("找不到店家，搜尋條件：", {
        storeAccountId: storeAccount.id,
        storeId,
        username: storeAccount.username,
        availableStores: stores.map(s => ({ id: s.id, username: s.username }))
      })
      throw new Error("找不到店家")
    }

    // 如果要更改店家帳號，檢查是否已存在
    if (updateData.username && updateData.username !== stores[storeIndex].username) {
      if (stores.some((s, i) => i !== storeIndex && s.username === updateData.username)) {
        throw new Error("店家帳號已存在")
      }
    }

    // 更新店家資料，但保留店家代號不變
    const updatedStore: StoreInfo = {
      ...stores[storeIndex],
      ...updateData,
      id: stores[storeIndex].id, // 確保 ID 不被更改
      storeCode: stores[storeIndex].storeCode, // 確保店家代號不被更改
      updatedAt: new Date().toISOString(),
    }
    stores[storeIndex] = updatedStore

    // 更新 registeredStores
    localStorage.setItem("registeredStores", JSON.stringify(stores))

    // 更新 storeAccount
    const updatedStoreAccount = {
      ...storeAccount,
      id: updatedStore.id,
      storeId: updatedStore.id,
      storeCode: updatedStore.storeCode,
      username: updateData.username || storeAccount.username,
      name: updateData.name || storeAccount.name,
      location: updateData.location || storeAccount.location,
      description: updateData.description || storeAccount.description,
      businessHours: updateData.businessHours || storeAccount.businessHours,
      phone: updateData.phone || storeAccount.phone,
      email: updateData.email || storeAccount.email,
    }
    localStorage.setItem("storeAccount", JSON.stringify(updatedStoreAccount))

    // 觸發店家資料更新事件
    const event = new CustomEvent("storeUpdated", {
      detail: {
        storeId: updatedStore.id,
        updates: updateData,
      },
    })
    window.dispatchEvent(event)

    return {
      success: true,
      store: updatedStoreAccount,
    }
  } catch (error) {
    console.error("Error updating store info:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "更新失敗",
    }
  }
} 