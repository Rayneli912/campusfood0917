-- ========================================
-- 修改 quantity 字段为 TEXT 类型
-- ========================================
-- 
-- 执行方式：
-- 1. 进入 Supabase Dashboard
-- 2. 点击左侧 "SQL Editor"
-- 3. 点击 "New query"
-- 4. 复制并贴上下方所有内容
-- 5. 点击 "Run" 执行
-- 
-- ========================================

-- 修改 near_expiry_posts 表中的 quantity 字段类型
-- 从 INTEGER 改为 TEXT，允许任意文本内容
ALTER TABLE near_expiry_posts 
ALTER COLUMN quantity TYPE TEXT USING quantity::TEXT;

-- 添加注释说明
COMMENT ON COLUMN near_expiry_posts.quantity IS '数量字段（支持任意文本，不限于数字）';

-- ========================================
-- ✅ 执行成功后，quantity 字段将可以接受任意文本
-- ========================================

