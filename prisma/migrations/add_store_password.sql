-- ============================================
-- 為 stores 表添加明文密碼列（僅用於測試）
-- ============================================

-- 添加 password 列（明文密碼，僅用於測試環境）
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS password TEXT;

-- 更新現有店家的明文密碼（如果有的話，從 pending_stores 複製）
-- 注意：這只能用於新註冊的店家，已存在的店家需要重置密碼

-- 驗證
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'stores' 
  AND column_name IN ('password', 'password_hash')
ORDER BY ordinal_position;
