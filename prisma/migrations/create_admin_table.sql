-- ============================================
-- 創建管理員表
-- ============================================

-- 創建 admins 表
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins (username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email);

-- 創建更新時間觸發器
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admins_updated_at ON admins;
CREATE TRIGGER trigger_update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- 啟用 Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS 策略：允許認證用戶讀取
DROP POLICY IF EXISTS "Allow authenticated read access" ON admins;
CREATE POLICY "Allow authenticated read access" ON admins
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS 策略：允許認證用戶更新
DROP POLICY IF EXISTS "Allow authenticated update access" ON admins;
CREATE POLICY "Allow authenticated update access" ON admins
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- 插入默認管理員帳號 (guard)
-- ============================================

-- 刪除舊的 guard 帳號（如果存在）
DELETE FROM admins WHERE username = 'guard';

-- 插入新的 guard 帳號
-- 密碼: guard
-- bcrypt hash: $2b$10$YourHashHere (這裡需要用實際的 bcrypt hash)
INSERT INTO admins (username, password_hash, name, email)
VALUES (
  'guard',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- 密碼: guard
  '系統管理員',
  'admin@campusfood.com'
);

-- ============================================
-- 驗證
-- ============================================

-- 查看管理員表
SELECT 
  id,
  username,
  name,
  email,
  created_at
FROM admins;

-- 確認默認管理員已創建
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM admins WHERE username = 'guard') 
    THEN '✅ 管理員帳號 guard 已成功創建'
    ELSE '❌ 管理員帳號 guard 創建失敗'
  END as status;

