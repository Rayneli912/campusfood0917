# 🔧 立即修復資料庫連接池快取問題

## ⚠️ 問題原因

Supabase 的連接池 (Pooler) 還在使用舊的 schema 快取，認為 `quantity` 還是 `integer` 類型。

---

## ✅ 立即生效的解決方案（推薦）

### 在 Vercel 添加直接連接 URL，繞過連接池

1. **獲取 Direct Connection URL**
   - 進入 Supabase Dashboard
   - 點擊左側「Settings」→「Database」
   - 找到「Connection string」區域
   - 選擇「**URI**」標籤（不是 Session pooling）
   - 複製顯示的連接字串（應該類似：`postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`）

2. **在 Vercel 添加環境變數**
   - 前往 Vercel Dashboard：https://vercel.com/dashboard
   - 選擇你的專案
   - 點擊「Settings」→「Environment Variables」
   - 添加新的環境變數：
     - **Name**: `DATABASE_DIRECT_URL`
     - **Value**: 貼上剛才複製的 Direct Connection URL
     - **Environment**: 勾選 Production, Preview, Development
   - 點擊「Save」

3. **重新部署**
   - 回到「Deployments」頁面
   - 點擊最新部署右側的「...」按鈕
   - 點擊「Redeploy」
   - 等待部署完成（約 1-2 分鐘）

4. **測試**
   - 部署完成後立即測試
   - 應該就能正常使用「測試」、「真假」等任意文字了！✅

---

## 🔄 替代方案：強制重啟 Pooler

如果不想改環境變數，可以在 Supabase 執行以下 SQL 來強制刷新所有連接：

```sql
-- 終止所有非系統連接（會強制所有客戶端重新連接）
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = current_database() 
AND pid <> pg_backend_pid()
AND usename != 'supabase_admin';
```

⚠️ **警告**：這會中斷所有現有連接，可能影響正在使用的用戶（但會立即重新連接）

---

## ⏰ 最簡單但最慢的方案

如果不想動任何設定，就等待 **15-20 分鐘**，連接池會自動過期並刷新 schema 快取。

---

## 🎯 推薦做法

**立即執行「立即生效的解決方案」**，這樣就能：
- ✅ 繞過連接池快取
- ✅ 使用最新的 schema
- ✅ 立即支援任意文字輸入
- ✅ 不影響現有功能

