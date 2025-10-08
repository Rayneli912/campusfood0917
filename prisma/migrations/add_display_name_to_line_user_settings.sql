-- 在 line_user_settings 表中添加 display_name 欄位
-- 執行此 SQL 來更新資料庫結構

-- 1. 添加 display_name 欄位（可為 NULL，之後會自動填入）
ALTER TABLE line_user_settings 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. 添加索引以提高查詢效率（可選）
CREATE INDEX IF NOT EXISTS idx_line_user_settings_display_name 
ON line_user_settings(display_name);

-- 3. 添加 last_name_update 欄位記錄最後更新暱稱的時間（可選，用於追蹤）
ALTER TABLE line_user_settings 
ADD COLUMN IF NOT EXISTS last_name_update TIMESTAMPTZ;

-- 完成！現在 line_user_settings 表包含以下欄位：
-- - user_id (主鍵)
-- - notify_new_post (布林值)
-- - followed (布林值)
-- - created_at (時間戳)
-- - updated_at (時間戳)
-- - display_name (新增 - 用戶暱稱)
-- - last_name_update (新增 - 最後更新暱稱時間)

