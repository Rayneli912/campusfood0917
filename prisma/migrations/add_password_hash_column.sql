-- ============================================
-- 添加 password_hash 列到 stores 表
-- ============================================

-- 1. 添加 password_hash 列（如果不存在）
ALTER TABLE stores ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. 更新现有记录的 password_hash（如果有 password）
UPDATE stores 
SET password_hash = password 
WHERE password IS NOT NULL AND password_hash IS NULL;

-- 3. 验证
SELECT id, name, username, 
       CASE WHEN password IS NOT NULL THEN 'YES' ELSE 'NO' END as has_password,
       CASE WHEN password_hash IS NOT NULL THEN 'YES' ELSE 'NO' END as has_password_hash
FROM stores
LIMIT 5;

