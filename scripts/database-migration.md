# 資料庫遷移指南

## 📋 概述

為了完全支援 LINE Bot 格式化訊息功能，需要在 Supabase 資料庫中添加新的欄位。目前系統已經修改為相容現有資料庫結構，但如果您想要完整的功能體驗，建議執行以下遷移。

## 🔄 當前狀態

**現有功能**：
- ✅ LINE Bot 基本格式解析正常工作
- ✅ 資訊會合併存儲在 `content` 欄位中
- ✅ 代碼管理透過 `content` 欄位實現
- ✅ 前端正常顯示現有資料

**限制**：
- ❌ 無法單獨查詢數量、期限、備註
- ❌ 無法在管理後台單獨編輯這些欄位
- ❌ 代碼管理功能簡化

## 🚀 完整功能遷移

如果您希望獲得完整功能，請在 Supabase 中執行以下 SQL：

### 1. 添加新欄位

```sql
-- 在 near_expiry_posts 表中添加新欄位
ALTER TABLE near_expiry_posts 
ADD COLUMN quantity INTEGER,
ADD COLUMN deadline TEXT,
ADD COLUMN note TEXT,
ADD COLUMN post_token_hash TEXT,
ADD COLUMN token_expires_at TIMESTAMP;

-- 添加索引以提高查詢效率
CREATE INDEX idx_near_expiry_posts_post_token_hash 
ON near_expiry_posts(post_token_hash);

CREATE INDEX idx_near_expiry_posts_token_expires_at 
ON near_expiry_posts(token_expires_at);
```

### 2. 更新現有數據（可選）

如果您有現有的 LINE Bot 數據需要遷移：

```sql
-- 這個腳本會嘗試從 content 欄位中提取結構化數據
-- 注意：這只是示例，您可能需要根據實際數據調整

UPDATE near_expiry_posts 
SET 
  quantity = CASE 
    WHEN content ~ '\(數量: ([0-9]+)\)' 
    THEN (regexp_match(content, '\(數量: ([0-9]+)\)'))[1]::INTEGER 
    ELSE NULL 
  END,
  deadline = CASE 
    WHEN content ~ '\[期限: ([^\]]+)\]' 
    THEN (regexp_match(content, '\[期限: ([^\]]+)\]'))[1]
    ELSE NULL 
  END,
  note = CASE 
    WHEN content ~ '備註: ([^\[]+)' 
    THEN trim((regexp_match(content, '備註: ([^\[]+)'))[1])
    ELSE NULL 
  END
WHERE source = 'line' AND content IS NOT NULL;

-- 清理 content 欄位，只保留物品名稱
UPDATE near_expiry_posts 
SET content = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(content, '\s*\(數量: [0-9]+\)', '', 'g'),
      '\s*\[期限: [^\]]+\]', '', 'g'
    ),
    '\s*備註: [^\[]+', '', 'g'
  ),
  '\s*\[代碼: [A-Z0-9]+\]', '', 'g'
)
WHERE source = 'line' AND content IS NOT NULL;
```

## 🔧 遷移後的程式碼更新

完成資料庫遷移後，需要更新以下檔案以恢復完整功能：

### 1. 更新 API 端點

```javascript
// app/api/news/route.ts - GET 請求
.select("id, created_at, location, content, image_url, status, source, quantity, deadline, note, post_token_hash, token_expires_at")

// app/api/news/route.ts - POST 請求
.insert({
  location: title,
  content,
  source,
  status: isPublished ? "published" : "draft",
  image_url: image_url || null,
  quantity: quantity || null,
  deadline: deadline || null,
  note: note || null,
  created_at: new Date().toISOString(),
})

// app/api/news/[id]/route.ts - PUT 請求
.update({
  location: title,
  content,
  source,
  status: isPublished ? "published" : "draft",
  image_url: image_url || null,
  quantity: quantity || null,
  deadline: deadline || null,
  note: note || null,
})
```

### 2. 更新用戶端數據載入

```javascript
// app/user/home/page.tsx 和 app/user/news/page.tsx
.select("id, created_at, location, content, image_url, status, source, quantity, deadline, note")
```

### 3. 更新管理員後台

```javascript
// app/admin/news/page.tsx
.select("id, created_at, location, content, image_url, status, source, quantity, deadline, note, post_token_hash, token_expires_at")
```

### 4. 更新 LINE Webhook

```javascript
// app/api/line/webhook/route.ts - 新增貼文
const { data, error } = await supabaseAdmin.from('near_expiry_posts').insert({
  location: parseResult.data!.location,
  content: parseResult.data!.item,
  quantity: parseResult.data!.quantity,
  deadline: parseResult.data!.deadline || null,
  note: parseResult.data!.note || null,
  post_token_hash: tokenHash,
  token_expires_at: expiresAt,
  line_user_id: userId ?? null,
  status: 'published',
  source: 'line'
}).select().single()

// app/api/line/webhook/route.ts - 修改貼文查詢
const { data: posts, error: fetchError } = await supabaseAdmin
  .from('near_expiry_posts')
  .select('*')
  .eq('post_token_hash', tokenHash)
  .eq('source', 'line')

// app/api/line/webhook/route.ts - 修改貼文更新
const { error: updateError } = await supabaseAdmin
  .from('near_expiry_posts')
  .update({
    location: parseResult.data!.location,
    content: parseResult.data!.item,
    quantity: parseResult.data!.quantity,
    deadline: parseResult.data!.deadline || null,
    note: parseResult.data!.note || null,
  })
  .eq('id', existingPost.id)
```

## 📊 功能對比

| 功能 | 當前版本 | 完整版本 |
|------|----------|----------|
| LINE Bot 格式解析 | ✅ | ✅ |
| 基本新增/修改 | ✅ | ✅ |
| 代碼管理 | 簡化版 | 完整版 |
| 數量查詢 | ❌ | ✅ |
| 期限查詢 | ❌ | ✅ |
| 備註查詢 | ❌ | ✅ |
| 管理後台編輯 | 基本版 | 完整版 |
| 數據分析 | 有限 | 完整 |

## ⚠️ 重要提醒

1. **備份數據**：執行遷移前請先備份您的資料庫
2. **測試環境**：建議先在測試環境中執行遷移
3. **程式碼更新**：遷移後需要同時更新程式碼
4. **漸進式遷移**：可以先執行資料庫遷移，再逐步更新程式碼

## 🚀 快速遷移腳本

如果您決定進行完整遷移，可以使用以下腳本：

```bash
#!/bin/bash
# 快速遷移腳本

echo "開始資料庫遷移..."

# 1. 執行 SQL 遷移（需要手動在 Supabase 中執行）
echo "請在 Supabase SQL 編輯器中執行 database-migration.sql"

# 2. 更新程式碼文件
echo "更新 API 端點..."
# 這裡可以添加自動化的文件更新腳本

echo "遷移完成！請重新啟動開發服務器。"
```

## 📞 支援

如果您在遷移過程中遇到任何問題，請：

1. 檢查 Supabase 日誌
2. 確認欄位類型正確
3. 驗證索引是否創建成功
4. 測試 API 端點功能

遷移完成後，您將擁有完整的 LINE Bot 格式化訊息管理系統！
