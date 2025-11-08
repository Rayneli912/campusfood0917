# 🔍 資料庫檢查步驟

## ⚠️ 如果修改還是失敗，請按照以下步驟檢查：

### 步驟 1：確認 SQL 執行在正確的資料庫

1. 進入 Supabase Dashboard
2. 確認左上角的專案名稱是否正確
3. 進入 SQL Editor
4. 執行以下查詢來**確認欄位類型**：

```sql
-- 查詢 quantity 欄位的類型
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'near_expiry_posts' 
AND column_name = 'quantity';
```

**預期結果**：
- `data_type` 應該顯示 `text` 或 `character varying`
- 如果還是 `integer`，代表 SQL 沒有成功執行

---

### 步驟 2：如果還是 integer，重新執行遷移

如果上面查詢結果還是 `integer`，請重新執行：

```sql
-- 強制轉換為 TEXT
ALTER TABLE near_expiry_posts 
ALTER COLUMN quantity TYPE TEXT USING COALESCE(quantity::TEXT, '');

-- 確認註解
COMMENT ON COLUMN near_expiry_posts.quantity IS '數量欄位（支援任意文字）';
```

---

### 步驟 3：清除 Supabase 連接池快取

有時候 Supabase 的連接池會快取舊的 schema，需要手動刷新：

1. 進入 Supabase Dashboard
2. 點擊左側「Settings」
3. 點擊「Database」
4. 找到「Connection pooling」區域
5. 點擊「Restart pooler」按鈕（如果有的話）

**或者等待 5-10 分鐘**，讓連接池自動刷新

---

### 步驟 4：測試資料庫是否更新

執行以下 SQL 測試插入：

```sql
-- 測試插入任意文字
INSERT INTO near_expiry_posts (
    location, 
    content, 
    quantity,
    deadline,
    status,
    source
) VALUES (
    '測試地點',
    '測試物品',
    '真假',  -- 任意文字
    '測試期限',
    'draft',
    'test'
);

-- 查看結果
SELECT id, location, quantity FROM near_expiry_posts 
WHERE location = '測試地點' 
ORDER BY created_at DESC 
LIMIT 1;

-- 刪除測試數據
DELETE FROM near_expiry_posts WHERE location = '測試地點';
```

**如果插入失敗**：代表資料庫欄位還沒改成功
**如果插入成功**：代表資料庫沒問題，可能是 Vercel 部署還沒完成

---

### 步驟 5：確認 Vercel 部署狀態

1. 前往：https://vercel.com/dashboard
2. 選擇你的專案
3. 確認最新的部署狀態是「Ready」
4. 部署通常需要 1-2 分鐘

---

### 步驟 6：測試 API

等 Vercel 部署完成後，測試修改功能：

```
修改+R7BKKU
【地點】：測試
【物品】：測試
【數量】：真假
【領取期限】：測試
【備註】：測試
```

應該成功發佈！✅

---

## 🆘 如果還是失敗

請提供以下資訊：

1. 步驟 1 的查詢結果（quantity 的 data_type）
2. 步驟 4 的測試結果（是否能插入）
3. Vercel 最新的錯誤日誌截圖

這樣我才能進一步診斷問題！

