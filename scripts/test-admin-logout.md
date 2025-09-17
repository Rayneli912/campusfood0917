# 管理員後台登出功能測試

## 測試步驟

### 1. 桌面版登出測試
1. 前往 http://localhost:3001/login
2. 使用 `guard`/`guard` 登入管理員後台
3. 確認成功進入 `/admin/dashboard`
4. 點擊右上角的「登出」按鈕
5. **預期結果**：應該自動跳轉回首頁 `/`（惜食快go 初始畫面）

### 2. 行動版登出測試
1. 將瀏覽器調整為行動裝置尺寸（寬度 < 768px）
2. 前往 http://localhost:3001/login
3. 使用 `guard`/`guard` 登入管理員後台
4. 確認成功進入管理員後台並看到底部導航
5. 點擊右上角的「登出」按鈕
6. **預期結果**：應該自動跳轉回首頁 `/`（惜食快go 初始畫面）

### 3. 登出狀態驗證
1. 登出後，檢查瀏覽器開發者工具
2. 前往 Application → Local Storage
3. **預期結果**：`adminAccount` 項目應該已被移除

### 4. 重新登入測試
1. 登出後在登入頁面
2. 再次使用 `guard`/`guard` 登入
3. **預期結果**：應該能正常重新登入管理員後台

### 5. 直接訪問測試
1. 登出後，嘗試直接訪問 http://localhost:3001/admin/dashboard
2. **預期結果**：應該自動跳轉回 `/login` 頁面（由於沒有 adminAccount）

## 修復內容

### 問題
- 點擊登出按鈕只移除了 localStorage，但沒有導航回首頁
- 用戶需要手動刷新或導航才能回到初始畫面

### 解決方案
1. **添加路由導航**：
   ```typescript
   const router = useRouter()
   
   const handleLogout = () => {
     localStorage.removeItem("adminAccount")
     router.push("/")  // 跳轉到首頁而非登入頁面
   }
   ```

2. **更新登出按鈕**：
   - 桌面版和行動版都使用 `handleLogout` 函數
   - 確保登出後自動跳轉到首頁

### 預期結果
- ✅ 點擊登出後立即跳轉到首頁（惜食快go 初始畫面）
- ✅ localStorage 中的 adminAccount 被清除
- ✅ 無法直接訪問管理員後台頁面
- ✅ 可以正常重新登入
