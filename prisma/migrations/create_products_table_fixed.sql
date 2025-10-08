-- ============================================
-- 創建商品表（修復版）
-- ============================================

-- 先檢查 stores 表的 id 類型
DO $$
DECLARE
  store_id_type text;
BEGIN
  SELECT data_type INTO store_id_type
  FROM information_schema.columns
  WHERE table_name = 'stores' AND column_name = 'id';
  
  RAISE NOTICE 'stores.id 類型: %', store_id_type;
END $$;

-- 創建 products 表（使用 TEXT 類型以匹配 stores.id）
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT ('product_' || gen_random_uuid()::text),
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  original_price DECIMAL(10, 2),
  discount_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  expiry_date TIMESTAMPTZ,
  image_url TEXT,
  category TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products (store_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products (is_available);
CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products (expiry_date);

-- 創建更新時間觸發器
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_products_updated_at ON products;
CREATE TRIGGER trigger_update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- 啟用 Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS 策略：允許所有用戶查看可用商品
DROP POLICY IF EXISTS "Allow public read available products" ON products;
CREATE POLICY "Allow public read available products" ON products
  FOR SELECT USING (is_available = true);

-- RLS 策略：允許服務角色完全訪問
DROP POLICY IF EXISTS "Service role full access" ON products;
CREATE POLICY "Service role full access" ON products
  FOR ALL TO service_role USING (true);

-- ============================================
-- 驗證
-- ============================================

-- 查看 products 表結構
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 確認表已創建
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') 
    THEN '✅ products 表已成功創建'
    ELSE '❌ products 表創建失敗'
  END as status;
