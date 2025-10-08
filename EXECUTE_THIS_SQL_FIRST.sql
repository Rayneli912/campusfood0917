-- ========================================
-- 🚀 立即執行此 SQL（必須！）
-- ========================================
-- 
-- 執行方式：
-- 1. 進入 Supabase Dashboard
-- 2. 點擊左側 "SQL Editor"
-- 3. 點擊 "New query"
-- 4. 複製並貼上下方所有內容
-- 5. 點擊 "Run" 執行
-- 
-- ========================================

-- 添加訂單取消相關欄位
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 添加索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_prepared_at ON orders(prepared_at);
CREATE INDEX IF NOT EXISTS idx_orders_store_id_status ON orders(store_id, status);

-- 添加欄位說明
COMMENT ON COLUMN orders.reason IS '取消或拒絕原因';
COMMENT ON COLUMN orders.cancelled_by IS '取消發起方：user, store, system';
COMMENT ON COLUMN orders.rejected_at IS '訂單被店家拒絕的時間';
COMMENT ON COLUMN orders.cancelled_at IS '訂單被取消的時間';

-- 添加 users 表的 password_hash 字段（修復密碼修改錯誤）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 為已有用户迁移密码数据
UPDATE users 
SET password_hash = password 
WHERE password_hash IS NULL AND password IS NOT NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

COMMENT ON COLUMN users.password_hash IS '用户密码哈希值（bcrypt）';

-- ========================================
-- ✅ 執行成功後，請重新啟動伺服器
-- npm run dev
-- ========================================

