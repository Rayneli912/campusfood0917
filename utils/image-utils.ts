/**
 * 生成佔位圖片URL
 * 使用統一的方式生成佔位圖片，減少重複代碼
 */
export function getPlaceholderImage(text: string, width = 300, height = 200, priority = false): string {
  // 使用簡化的URL參數
  return `/placeholder.svg?height=${height}&width=${width}&text=${encodeURIComponent(text)}`
}

/**
 * 獲取餐廳封面圖片
 */
export function getRestaurantCover(name: string): string {
  return getPlaceholderImage(name, 300, 200)
}

/**
 * 獲取菜單項目圖片
 */
export function getMenuItemImage(name: string): string {
  return getPlaceholderImage(name, 100, 100)
}

/**
 * 獲取用戶頭像
 */
export function getUserAvatar(username: string): string {
  return getPlaceholderImage(username, 40, 40)
}

/**
 * 獲取產品圖片
 */
export function getProductImage(name: string, width = 320, height = 160): string {
  return getPlaceholderImage(name, width, height)
}
