# 「我的最愛」與「近期瀏覽」功能測試清單

## 測試環境準備
1. 確保已有測試用戶帳號登入
2. 確保有可用的店家資料（store1, store2, store3）
3. 開啟瀏覽器開發者工具監控 localStorage 變化

## 「我的最愛」功能測試

### 1. 店家頁面愛心按鈕測試
- [ ] 進入任一店家頁面 (`/user/store/{id}`)
- [ ] 檢查右上角是否顯示愛心圖示
- [ ] 初始狀態愛心應為灰色/空心
- [ ] 點擊愛心按鈕，愛心應變為紅色/實心
- [ ] 再次點擊愛心按鈕，愛心應變回灰色/空心
- [ ] 檢查 localStorage 中 `user_{userId}_favorites` 是否正確更新

### 2. 我的最愛頁面測試
- [ ] 進入我的最愛頁面 (`/user/favorites`)
- [ ] 頁面應顯示已收藏的店家卡片
- [ ] 每個店家卡片上的愛心應為紅色/實心
- [ ] 點擊店家卡片上的愛心，該店家應從列表中移除
- [ ] 空狀態時應顯示「尚未收藏任何店家」提示

### 3. 跨頁面同步測試
- [ ] 在店家頁面加入收藏
- [ ] 切換到我的最愛頁面，應立即看到新增的店家
- [ ] 在我的最愛頁面移除收藏
- [ ] 回到店家頁面，愛心應變為灰色/空心

## 「近期瀏覽」功能測試

### 1. 瀏覽記錄生成測試
- [ ] 訪問多個不同的店家頁面
- [ ] 檢查 localStorage 中 `user_{userId}_recentViews` 是否記錄瀏覽
- [ ] 重複訪問同一店家，應該更新瀏覽時間而不重複記錄

### 2. 近期瀏覽頁面測試
- [ ] 進入近期瀏覽頁面 (`/user/recent`)
- [ ] 應按瀏覽時間倒序顯示店家卡片
- [ ] 檢查是否顯示「清除記錄」按鈕
- [ ] 點擊「清除記錄」按鈕，所有記錄應被清除
- [ ] 清除後應顯示「尚無瀏覽記錄」提示

### 3. 收藏功能整合測試
- [ ] 在近期瀏覽頁面中，點擊店家卡片上的愛心
- [ ] 愛心應變為紅色/實心
- [ ] 切換到我的最愛頁面，應看到該店家

## 管理員後台同步測試

### 1. 用戶詳情對話框測試
- [ ] 以管理員身份登入
- [ ] 進入用戶管理頁面
- [ ] 點擊任一用戶查看詳情
- [ ] 切換到「我的最愛」分頁，應顯示該用戶的收藏
- [ ] 切換到「近期瀏覽」分頁，應顯示該用戶的瀏覽記錄

### 2. 即時同步測試
- [ ] 開啟兩個瀏覽器分頁：用戶端 + 管理員後台
- [ ] 在用戶端進行收藏/瀏覽操作
- [ ] 在管理員後台重新載入用戶詳情
- [ ] 應能看到最新的資料變化

## 資料完整性測試

### 1. 重複資料處理
- [ ] 多次收藏同一店家，localStorage 中不應有重複記錄
- [ ] 多次瀏覽同一店家，只應保留最新的瀏覽時間

### 2. 資料去重測試
- [ ] 手動在 localStorage 中添加重複的收藏記錄
- [ ] 重新載入我的最愛頁面，應自動去重
- [ ] 檢查是否仍能正常操作

### 3. 錯誤處理測試
- [ ] 清除 localStorage 中的用戶資料
- [ ] 重新載入頁面，應能正常處理空資料狀態
- [ ] 手動損壞 localStorage 中的 JSON 資料
- [ ] 應用程式應能優雅地處理錯誤

## 效能測試

### 1. 大量資料測試
- [ ] 收藏 10+ 個店家
- [ ] 瀏覽 20+ 個店家頁面
- [ ] 檢查頁面載入速度是否正常
- [ ] 檢查資料操作是否流暢

### 2. 記憶體洩漏測試
- [ ] 在不同頁面間快速切換
- [ ] 使用瀏覽器開發者工具監控記憶體使用
- [ ] 確保沒有明顯的記憶體洩漏

## 資料庫相容性驗證

### 1. 資料格式檢查
- [ ] 使用 `validateDataIntegrity()` 函數檢查資料完整性
- [ ] 確保所有必要欄位都存在
- [ ] 檢查資料類型是否正確

### 2. 遷移準備測試
- [ ] 執行 `migrateUserDataToDatabase()` 函數（模擬模式）
- [ ] 檢查轉換後的資料格式
- [ ] 確保資料可以正確對應到 Prisma schema

## 測試結果記錄

### 通過的測試項目
- [ ] 所有基本功能正常運作
- [ ] 跨頁面資料同步正常
- [ ] 管理員後台顯示正確
- [ ] 資料完整性良好
- [ ] 效能表現符合預期

### 發現的問題
- [ ] 記錄發現的任何問題
- [ ] 標註問題的嚴重程度
- [ ] 提供修復建議

### 改進建議
- [ ] UX/UI 改進建議
- [ ] 效能優化建議
- [ ] 功能擴展建議

---

## 自動化測試腳本

可以在瀏覽器控制台中執行以下腳本來進行自動化測試：

```javascript
// 測試資料完整性
function testDataIntegrity() {
  const { validateDataIntegrity } = require('@/lib/database-compatibility');
  const userId = JSON.parse(localStorage.getItem('user'))?.id;
  if (!userId) {
    console.error('未找到登入用戶');
    return;
  }
  
  const result = validateDataIntegrity(userId);
  console.log('資料完整性檢查結果:', result);
  return result;
}

// 測試收藏功能
function testFavorites() {
  const userId = JSON.parse(localStorage.getItem('user'))?.id;
  const favoritesKey = `user_${userId}_favorites`;
  
  console.log('當前收藏:', JSON.parse(localStorage.getItem(favoritesKey) || '[]'));
  
  // 模擬添加收藏
  const mockFavorite = {
    id: 'test-store',
    type: 'store',
    name: '測試店家',
    image: '/test-image.jpg'
  };
  
  const currentFavorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
  currentFavorites.push(mockFavorite);
  localStorage.setItem(favoritesKey, JSON.stringify(currentFavorites));
  
  console.log('添加測試收藏後:', JSON.parse(localStorage.getItem(favoritesKey) || '[]'));
}

// 執行測試
testDataIntegrity();
testFavorites();
```
