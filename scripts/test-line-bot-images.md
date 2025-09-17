# LINE Bot 圖片顯示測試和修復指南

## 問題描述
需要確保用戶上傳至 LINE Bot 的圖片能夠正確在最新即食消息頁面中顯示。

## 修復內容

### 🔧 1. 修復 DialogContent 無障礙性錯誤
**問題**：`PhotoViewerDialog` 組件的 `DialogContent` 缺少 `DialogTitle`，導致無障礙性警告。

**修復方案**：
- 在 `PhotoViewerDialog` 組件中添加隱藏的 `DialogTitle`
- 使用 `sr-only` 類別使標題僅對螢幕閱讀器可見
- 動態顯示當前圖片索引信息

**修復後的代碼**：
```tsx
<DialogTitle className="sr-only">
  圖片檢視器 - 第 {currentIndex + 1} 張，共 {images.length} 張
</DialogTitle>
```

### 🖼️ 2. LINE Bot 圖片顯示機制驗證

#### **圖片處理流程**：
1. **LINE Webhook 接收圖片**：
   - 用戶在 LINE 發送圖片
   - Webhook 接收 `image` 類型消息
   - 調用 `fetchLineImage()` 下載圖片

2. **圖片上傳到 Supabase Storage**：
   - 使用 `uploadImageToBucket()` 上傳到 `near_expiry_images` bucket
   - 存儲路徑：`line/{messageId}.jpg`
   - 獲取公開 URL

3. **保存到資料庫**：
   ```sql
   INSERT INTO near_expiry_posts (
     location, content, image_url, 
     line_user_id, status, source
   ) VALUES (
     '未標地點', '（圖片）', publicUrl,
     userId, 'published', 'line'
   )
   ```

4. **前端顯示邏輯**：
   - `getNewsImages()` 函數處理圖片 URL
   - 優先使用 `images` 數組，備用 `image_url` 字段
   - `NewsPhotoThumbnail` 組件顯示縮圖
   - `PhotoViewerDialog` 提供全屏查看

### 🧪 3. 創建測試組件

#### **LineImageTest 組件功能**：
- 載入所有來自 LINE Bot 的貼文
- 顯示每個貼文的詳細信息
- 提供圖片載入測試功能
- 直接在瀏覽器中預覽圖片
- 調試圖片 URL 和載入狀態

#### **測試頁面位置**：
`http://localhost:3000/test/line-images`

## 測試步驟

### 📱 1. LINE Bot 圖片上傳測試

#### **準備工作**：
1. 確保 LINE Bot 已正確配置
2. 確保 Webhook URL 指向正確的端點
3. 確保 Supabase 環境變數正確設定

#### **測試步驟**：
1. **發送圖片到 LINE Bot**：
   - 打開 LINE 應用
   - 找到您的 Bot 帳號
   - 發送一張圖片

2. **檢查 Webhook 處理**：
   - 查看伺服器日誌
   - 確認圖片下載成功
   - 確認上傳到 Supabase Storage 成功

3. **檢查資料庫記錄**：
   - 登入 Supabase 控制台
   - 查看 `near_expiry_posts` 表
   - 確認新記錄的 `image_url` 字段有值
   - 確認 `source` 字段為 `'line'`

### 🖥️ 2. 前端顯示測試

#### **測試頁面**：
訪問測試頁面：`http://localhost:3000/test/line-images`

#### **測試項目**：
1. **數據載入**：
   - 確認能載入 LINE Bot 貼文
   - 檢查貼文數量和內容
   - 確認圖片 URL 正確顯示

2. **圖片顯示**：
   - 檢查圖片是否正確渲染
   - 測試圖片載入狀態
   - 使用「測試載入」按鈕驗證 URL

3. **圖片操作**：
   - 點擊「開啟連結」直接查看圖片
   - 檢查圖片 URL 格式
   - 確認圖片可訪問

### 📰 3. 用戶端頁面測試

#### **首頁測試**：
1. **訪問用戶端首頁**：`http://localhost:3000/user/home`
2. **檢查即食消息區域**：
   - 確認 LINE Bot 貼文顯示
   - 檢查照片縮圖是否出現
   - 點擊縮圖測試 `PhotoViewerDialog`

3. **詳細檢查**：
   - 點擊消息框查看詳情對話框
   - 確認完整圖片正確顯示
   - 測試多張圖片的輪播功能

#### **新聞頁面測試**：
1. **訪問新聞頁面**：`http://localhost:3000/user/news`
2. **檢查 LINE Bot 消息**：
   - 確認所有 LINE Bot 消息顯示
   - 檢查照片縮圖
   - 測試消息點擊和圖片查看

### 🔍 4. 調試和故障排除

#### **常見問題檢查**：

1. **圖片不顯示**：
   ```javascript
   // 檢查控制台錯誤
   console.log("圖片 URL:", imageUrl)
   console.error("圖片載入失敗:", error)
   ```

2. **Next.js Image 組件錯誤**：
   - 檢查 `next.config.mjs` 中的 `images.remotePatterns`
   - 確認 Supabase 域名已配置

3. **CORS 問題**：
   - 檢查 Supabase Storage 設定
   - 確認 bucket 為公開讀取

4. **權限問題**：
   - 檢查 Supabase RLS 政策
   - 確認 `near_expiry_posts` 表可讀取

#### **調試工具**：

1. **瀏覽器開發者工具**：
   - Network 標籤：檢查圖片請求狀態
   - Console 標籤：查看錯誤訊息
   - Elements 標籤：檢查 HTML 結構

2. **Supabase 控制台**：
   - Storage：檢查圖片文件
   - Database：檢查 `near_expiry_posts` 記錄
   - Logs：查看 API 請求日誌

3. **測試頁面**：
   - 使用 `/test/line-images` 頁面調試
   - 檢查圖片 URL 格式
   - 測試圖片載入狀態

## 預期結果

### ✅ 成功指標：

1. **LINE Bot 接收**：
   - 用戶發送圖片後收到確認回覆
   - 圖片成功上傳到 Supabase Storage
   - 資料庫記錄正確創建

2. **前端顯示**：
   - 用戶端首頁顯示 LINE Bot 消息
   - 照片縮圖正確顯示
   - 點擊縮圖打開圖片檢視器
   - 詳情對話框顯示完整圖片

3. **無障礙性**：
   - 無 DialogContent 警告
   - 螢幕閱讀器可正確讀取
   - 鍵盤導航正常工作

### 🔧 故障排除清單：

- [ ] LINE Bot Webhook 正常運作
- [ ] Supabase Storage 上傳成功
- [ ] 資料庫記錄正確創建
- [ ] Next.js 圖片域名配置正確
- [ ] 前端圖片載入成功
- [ ] PhotoViewerDialog 無警告
- [ ] 用戶端頁面顯示正常
- [ ] 圖片交互功能正常

## 技術細節

### 🔗 相關文件：
- `app/api/line/webhook/route.ts` - LINE Webhook 處理
- `components/photo-viewer-dialog.tsx` - 圖片檢視器
- `components/news-photo-thumbnail.tsx` - 照片縮圖
- `components/line-image-test.tsx` - 測試組件
- `app/user/home/page.tsx` - 用戶端首頁
- `app/user/news/page.tsx` - 新聞頁面

### 📊 資料庫結構：
```sql
-- near_expiry_posts 表
CREATE TABLE near_expiry_posts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  location TEXT,
  content TEXT,
  image_url TEXT, -- LINE Bot 圖片 URL
  line_user_id TEXT,
  status TEXT DEFAULT 'published',
  source TEXT DEFAULT 'line'
);
```

### 🌐 Supabase Storage 設定：
- Bucket 名稱：`near_expiry_images`
- 路徑格式：`line/{messageId}.jpg`
- 權限：公開讀取
- CORS：允許所有來源

通過以上測試步驟，您可以全面驗證 LINE Bot 圖片上傳和顯示功能是否正常工作！
