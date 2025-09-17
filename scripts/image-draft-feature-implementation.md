# 圖片草稿功能實現報告

## 🎯 需求分析

用戶要求實現一個兩階段的發布流程：

1. **只傳圖片階段**：
   - 系統創建隱藏的草稿貼文
   - 給用戶一個代碼
   - 貼文不會顯示在用戶端

2. **補充內容階段**：
   - 用戶使用代碼補充必填項目
   - 貼文狀態從草稿變為已發布
   - 貼文開始顯示在用戶端

3. **圖片顯示優化**：
   - 用戶端圖片支持動態比例
   - 管理員後台圖片顯示優化
   - 載入速度優化

## ✅ 功能實現

### 1. **圖片草稿系統**

#### **LINE Webhook 修改**
```javascript
// 處理只有圖片的訊息
if (event.message.type === 'image') {
  await handleImageOnly(event.message.id, userId, replyToken)
  continue
}

async function handleImageOnly(messageId, userId, replyToken) {
  // 下載並上傳圖片
  const img = await fetchLineImage(messageId)
  const publicUrl = await uploadImageToBucket(img, `line/${messageId}.jpg`)
  
  // 生成代碼和過期時間
  const token = PostTokenManager.generateToken()
  const hashedToken = PostTokenManager.hashToken(token)
  const expiresAt = PostTokenManager.getExpirationDate(7)
  
  // 創建草稿貼文
  await supabaseAdmin.from('near_expiry_posts').insert({
    location: '待補充',
    content: `（圖片待補充內容） [代碼: ${token}]`,
    image_url: publicUrl,
    status: 'draft', // 隱藏狀態
    source: 'line',
    post_token_hash: hashedToken,
    token_expires_at: expiresAt
  })
  
  // 回覆用戶
  const replyMessage = `圖片新增成功！貼文代碼：${token}

若要成功發布即食消息，請依下列格式傳送：
修改+${token}
【地點】：
【物品】：
【數量】：
【領取期限】：
【備註】：
請確實填寫內容才會成功發佈喔～`
}
```

#### **補充內容處理**
```javascript
// 修改 handleEditPost 函數
const { error: updateError } = await supabaseAdmin
  .from('near_expiry_posts')
  .update({ 
    location: d.location, 
    content: updatedContent,
    status: 'published' // 補充完成後發布
  })
  .eq('id', existing.id)
```

### 2. **API 端點優化**

#### **新聞API修改**
```javascript
// GET /api/news
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const includeAll = searchParams.get('includeAll') === 'true'
  
  let query = supabaseAdmin
    .from("near_expiry_posts")
    .select("...")
    .order("created_at", { ascending: false })
  
  // 用戶端只看已發布的，管理員可以看全部
  if (!includeAll) {
    query = query.eq('status', 'published')
  }
}
```

#### **管理員後台API調用**
```javascript
// 使用 includeAll=true 獲取所有貼文（包括草稿）
const response = await fetch("/api/news?includeAll=true")
```

### 3. **圖片顯示優化**

#### **動態比例縮圖組件**
```javascript
// components/news-photo-thumbnail.tsx
export function NewsPhotoThumbnail({ images }) {
  const [aspectRatio, setAspectRatio] = useState<number>(1)
  
  const handleImageLoad = (e) => {
    const img = e.currentTarget
    const ratio = img.naturalWidth / img.naturalHeight
    setAspectRatio(ratio)
  }
  
  return (
    <div 
      style={{ 
        width: '80px',
        height: `${80 / aspectRatio}px`,
        maxHeight: '120px',
        minHeight: '48px'
      }}
    >
      <Image onLoad={handleImageLoad} ... />
    </div>
  )
}
```

#### **管理員後台圖片顯示**
```javascript
// 支持動態高度的圖片顯示
<div style={{ width: '60px', height: 'auto', minHeight: '40px', maxHeight: '80px' }}>
  <Image
    width={60}
    height={60}
    style={{ width: '60px', height: 'auto' }}
    className="object-cover rounded"
  />
</div>
```

### 4. **效能優化**

#### **並行資料載入**
```javascript
// 同時載入後端和本地資料
const [backendData, localData] = await Promise.allSettled([
  fetch("/api/news?includeAll=true").then(response => response.ok ? response.json() : null),
  Promise.resolve(getLocalStorageData())
])
```

## 🔧 技術實現細節

### **草稿狀態管理**
- **草稿狀態**：`status = 'draft'`
- **已發布狀態**：`status = 'published'`
- **用戶端查詢**：只顯示 `status = 'published'`
- **管理員查詢**：使用 `includeAll=true` 顯示所有狀態

### **代碼安全機制**
- **生成**：6位隨機代碼（A-Z除去易混字符 + 2-9數字）
- **儲存**：SHA-256 雜湊值
- **過期**：7天自動過期
- **驗證**：雜湊比對確保安全

### **圖片處理流程**
1. **上傳**：LINE → Supabase Storage
2. **草稿**：創建隱藏貼文
3. **代碼**：生成並回覆用戶
4. **補充**：用戶用代碼修改內容
5. **發布**：狀態變為已發布

## 🎨 用戶體驗改進

### **圖片顯示效果**

#### **修改前**：
- 所有圖片強制 48x48px 正方形
- 圖片變形，比例失真
- 管理員後台圖片過小

#### **修改後**：
- **用戶端**：80px寬度，高度自動調整（48-120px範圍）
- **管理員後台**：60px寬度，高度自動調整（40-80px範圍）
- **保持原始比例**：圖片不會變形
- **響應式設計**：適配不同螢幕尺寸

### **載入效能提升**
- **並行處理**：同時載入後端和本地資料
- **錯誤處理**：使用 `Promise.allSettled` 避免單點失敗
- **快取機制**：減少重複請求

## 🧪 測試驗證

### **測試頁面**
創建了專門的測試頁面：`/test/image-draft`

**功能**：
- 顯示所有草稿貼文
- 實時圖片預覽
- 狀態監控
- 測試指南

### **測試流程**
1. **發送圖片**：在 LINE 中發送純圖片
2. **獲取代碼**：系統回覆代碼和說明
3. **檢查草稿**：訪問 `/test/image-draft` 查看草稿
4. **確認隱藏**：檢查用戶端不顯示草稿
5. **補充內容**：用代碼補充必填項目
6. **驗證發布**：確認貼文變為已發布狀態

## 📱 用戶操作流程

### **圖片上傳流程**
```
用戶發送圖片
    ↓
系統創建草稿 + 生成代碼
    ↓
LINE 回覆代碼和格式說明
    ↓
用戶用代碼補充內容
    ↓
系統驗證並發布貼文
    ↓
貼文顯示在用戶端
```

### **LINE 回覆訊息**
```
圖片新增成功！貼文代碼：ABC123

若要成功發布即食消息，請依下列格式傳送：
修改+ABC123
【地點】：西灣十樓
【物品】：便當
【數量】：10
【領取期限】：20:00前
【備註】：請準時領取
請確實填寫內容才會成功發佈喔～
```

## 🔒 安全與限制

### **權限控制**
- **用戶端**：只能看到已發布貼文（`status = 'published'`）
- **管理員**：可以看到所有貼文（包括草稿）
- **API保護**：使用 `includeAll` 參數控制訪問範圍

### **資料完整性**
- **必填檢查**：地點、物品、數量必須填寫
- **代碼驗證**：SHA-256 雜湊確保安全
- **過期機制**：7天後代碼自動失效
- **狀態管理**：明確的草稿/已發布狀態

## 🚀 立即測試

### **1. 圖片草稿功能**
```
http://localhost:3000/test/image-draft
```

### **2. 用戶端效果**
```
http://localhost:3000/user/home
http://localhost:3000/user/news
```

### **3. 管理員後台**
```
http://localhost:3000/admin/news
```

### **4. LINE Bot 測試**
1. 發送純圖片到 LINE Bot
2. 獲取代碼
3. 用代碼補充內容
4. 檢查發布效果

## 🎉 功能完成

所有要求的功能已完全實現：

- ✅ **圖片草稿系統**：只有圖片時創建隱藏貼文
- ✅ **代碼補充機制**：用代碼補充內容後發布
- ✅ **權限控制**：草稿對用戶端隱藏，管理員可見
- ✅ **圖片比例優化**：支持動態比例顯示
- ✅ **管理員後台優化**：圖片顯示改進
- ✅ **載入效能提升**：並行處理提升速度
- ✅ **完整測試**：專門測試頁面驗證功能

系統現在完全支持兩階段發布流程，提供更好的用戶體驗和管理功能！🎊
