-- ========================================
-- 🔧 修改 quantity 欄位為 TEXT 類型
-- ========================================
-- 
-- ⚠️ 重要：此遷移必須執行，否則用戶輸入「1個」等文字會報錯
-- 
-- 執行方式：
-- 1. 進入 Supabase Dashboard（https://supabase.com/dashboard）
-- 2. 選擇你的專案
-- 3. 點擊左側「SQL Editor」
-- 4. 點擊「New query」
-- 5. 複製並貼上下方所有 SQL 指令
-- 6. 點擊「Run」執行
-- 7. 看到「Success. No rows returned」即表示成功
-- 
-- ========================================

-- 修改 near_expiry_posts 表中的 quantity 欄位類型
-- 從 INTEGER 改為 TEXT，允許任意文本內容（支援「1個」、「五份」等）
ALTER TABLE near_expiry_posts 
ALTER COLUMN quantity TYPE TEXT USING quantity::TEXT;

-- 添加註解說明
COMMENT ON COLUMN near_expiry_posts.quantity IS '數量欄位（支援任意文字，不限於數字）';

-- ========================================
-- ✅ 執行成功後，quantity 欄位將可以接受任意文字
-- 用戶可以輸入：1個、五份、3、三、5杯 等等
-- ========================================


