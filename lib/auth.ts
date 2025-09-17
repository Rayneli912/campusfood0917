// 用戶認證服務
const authService = {
  // 檢查用戶是否存在
  checkUserExists: (username: string): boolean => {
    const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
    return registeredUsers.some((user: any) => user.username === username)
  },

  // 用戶登入
  login: (username: string, password: string): { success: boolean; message?: string; user?: any } => {
    try {
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      const user = registeredUsers.find((u: any) => u.username === username)

      if (!user) {
        return { success: false, message: "此帳號不存在" }
      }

      if (user.password !== password) {
        return { success: false, message: "密碼錯誤" }
      }

      // 登入成功，存儲當前用戶信息
      localStorage.setItem("user", JSON.stringify(user))
      return { success: true, user }
    } catch (error) {
      console.error("登入時發生錯誤:", error)
      return { success: false, message: "登入時發生錯誤" }
    }
  },

  // 用戶註冊
  register: (userData: any): { success: boolean; message?: string; user?: any } => {
    try {
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      
      // 檢查用戶名是否已存在
      if (registeredUsers.some((u: any) => u.username === userData.username)) {
        return { success: false, message: "此帳號已被使用" }
      }

      // 生成用戶ID
      const userId = `user_${Date.now()}`
      const newUser = {
        id: userId,
        ...userData,
        createdAt: new Date().toISOString()
      }

      // 添加新用戶
      registeredUsers.push(newUser)
      localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))

      // 初始化用戶數據
      initializeUserData(userId)

      return { success: true, user: newUser }
    } catch (error) {
      console.error("註冊時發生錯誤:", error)
      return { success: false, message: "註冊時發生錯誤" }
    }
  },

  // 更新用戶狀態
  updateUserStatus: (userId: string, isDisabled: boolean) => {
    if (typeof window === "undefined") return false

    try {
      // 從 localStorage 獲取用戶列表
      const storedUsers = localStorage.getItem("registeredUsers")
      const users = storedUsers ? JSON.parse(storedUsers) : []

      // 查找並更新用戶狀態
      const userIndex = users.findIndex((user: any) => user.id === userId)
      if (userIndex !== -1) {
        users[userIndex].isDisabled = isDisabled
        localStorage.setItem("registeredUsers", JSON.stringify(users))
        return true
      }

      return false
    } catch (error) {
      console.error("Error updating user status:", error)
      return false
    }
  },

  // 獲取用戶資料
  getUserData: (userId: string) => {
    if (typeof window === "undefined") return null

    try {
      // 從 localStorage 獲取用戶列表
      const storedUsers = localStorage.getItem("registeredUsers")
      const users = storedUsers ? JSON.parse(storedUsers) : []

      // 查找用戶
      const user = users.find((u: any) => u.id === userId)
      if (!user) return null

      // 返回用戶資料
      return {
        ...user,
        favorites: user.favorites || [],
        recentViews: user.recentViews || [],
        cart: user.cart || [],
        activeOrders: user.activeOrders || [],
        orderHistory: user.orderHistory || []
      }
    } catch (error) {
      console.error("Error getting user data:", error)
      return null
    }
  },

  // 用戶登出
  logout: (): boolean => {
    if (typeof window === "undefined") return false

    try {
      localStorage.removeItem("user")
      return true
    } catch (error) {
      console.error("登出時發生錯誤:", error)
      return false
    }
  },

  // 獲取當前用戶
  getCurrentUser: () => {
    if (typeof window === "undefined") return null

    try {
      const userStr = localStorage.getItem("user")
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  },

  // 檢查用戶是否已登入
  isLoggedIn: () => {
    if (typeof window === "undefined") return false

    try {
      const userStr = localStorage.getItem("user")
      return !!userStr
    } catch (error) {
      console.error("Error checking login status:", error)
      return false
    }
  },

  // 停用用戶帳號
  disableUser: (userId: string) => {
    try {
      const storedUsers = localStorage.getItem("registeredUsers")
      if (!storedUsers) return false

      const users = JSON.parse(storedUsers)
      const userIndex = users.findIndex((u: any) => u.id === userId)

      if (userIndex === -1) return false

      // 更新用戶狀態
      users[userIndex].isDisabled = true

      // 保存更新後的用戶列表
      localStorage.setItem("registeredUsers", JSON.stringify(users))

      // 如果被停用的用戶當前已登入，強制登出
      const currentUser = localStorage.getItem("user")
      if (currentUser) {
        const user = JSON.parse(currentUser)
        if (user.id === userId) {
          localStorage.removeItem("user")
        }
      }

      return true
    } catch (error) {
      console.error("Error disabling user:", error)
      return false
    }
  },

  // 啟用用戶帳號
  enableUser: (userId: string) => {
    try {
      const storedUsers = localStorage.getItem("registeredUsers")
      if (!storedUsers) return false

      const users = JSON.parse(storedUsers)
      const userIndex = users.findIndex((u: any) => u.id === userId)

      if (userIndex === -1) return false

      // 更新用戶狀態
      users[userIndex].isDisabled = false

      // 保存更新後的用戶列表
      localStorage.setItem("registeredUsers", JSON.stringify(users))

      return true
    } catch (error) {
      console.error("Error enabling user:", error)
      return false
    }
  },

  // 更新用戶帳號密碼
  updateUserCredentials: (userId: string, username: string, password: string): { success: boolean; message?: string } => {
    try {
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      const userIndex = registeredUsers.findIndex((u: any) => u.id === userId)

      if (userIndex === -1) {
        return { success: false, message: "用戶不存在" }
      }

      // 如果要更改用戶名，檢查新用戶名是否已被使用
      if (username !== registeredUsers[userIndex].username) {
        if (registeredUsers.some((u: any) => u.username === username)) {
          return { success: false, message: "此帳號已被使用" }
        }
      }

      // 更新用戶資料
      registeredUsers[userIndex] = {
        ...registeredUsers[userIndex],
        username,
        password,
        updatedAt: new Date().toISOString()
      }

      // 保存更新
      localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))

      // 如果是當前登入用戶，更新當前用戶資料
      const currentUser = localStorage.getItem("user")
      if (currentUser) {
        const user = JSON.parse(currentUser)
        if (user.id === userId) {
          localStorage.setItem("user", JSON.stringify(registeredUsers[userIndex]))
        }
      }

      return { success: true }
    } catch (error) {
      console.error("更新用戶帳號密碼時發生錯誤:", error)
      return { success: false, message: "更新時發生錯誤" }
    }
  },
}

// 初始化用戶數據
function initializeUserData(userId: string) {
  try {
    // 初始化各種數據
    const keys = [
      `user_${userId}_favorites`,
      `user_${userId}_recentViews`,
      `user_${userId}_cart`,
      `user_${userId}_activeOrders`,
      `user_${userId}_orderHistory`
    ]

    keys.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "[]")
      }
    })

    // 初始化設定
    if (!localStorage.getItem(`user_${userId}_notifications`)) {
      localStorage.setItem(`user_${userId}_notifications`, JSON.stringify({
        email: true,
        push: true,
        orderUpdates: true,
        promotions: true
      }))
    }

    if (!localStorage.getItem(`user_${userId}_privacy`)) {
      localStorage.setItem(`user_${userId}_privacy`, JSON.stringify({
        showProfile: true,
        showHistory: false
      }))
    }
  } catch (error) {
    console.error("初始化用戶數據時發生錯誤:", error)
  }
}

export default authService
