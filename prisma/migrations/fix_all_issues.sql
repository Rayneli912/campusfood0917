-- ============================================
-- 修復所有剩餘問題的 SQL 腳本
-- ============================================

-- ============================================
-- 1. 為 stores 表添加明文密碼列
-- ============================================
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS password TEXT;

-- ============================================
-- 2. 刪除重複的 store_products 表
-- ============================================
DROP TABLE IF EXISTS store_products CASCADE;

-- ============================================
-- 3. 確認用戶功能表存在
-- ============================================

-- 近期瀏覽表
CREATE TABLE IF NOT EXISTS recent_views (
  id TEXT PRIMARY KEY DEFAULT ('view_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 創建唯一索引（一個用戶對一個店家只保留最新的瀏覽記錄）
CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_views_unique 
ON recent_views (user_id, store_id);

-- 我的最愛表
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY DEFAULT ('fav_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 創建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_unique 
ON favorites (user_id, store_id);

-- 購物車表（如果不存在）
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY DEFAULT ('cart_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 創建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique 
ON cart_items (user_id, product_id);

-- 訂單表（如果不存在）
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT ('order_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 訂單項目表（如果不存在）
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT ('item_' || gen_random_uuid()::text),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. 啟用 RLS 並設置策略
-- ============================================

-- recent_views 表
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own recent views" ON recent_views;
CREATE POLICY "Users can view their own recent views" ON recent_views
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert their recent views" ON recent_views;
CREATE POLICY "Users can insert their recent views" ON recent_views
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access" ON recent_views;
CREATE POLICY "Service role full access" ON recent_views
  FOR ALL TO service_role USING (true);

-- favorites 表
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can manage their favorites" ON favorites;
CREATE POLICY "Users can manage their favorites" ON favorites
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access" ON favorites;
CREATE POLICY "Service role full access" ON favorites
  FOR ALL TO service_role USING (true);

-- cart_items 表
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their cart" ON cart_items;
CREATE POLICY "Users can manage their cart" ON cart_items
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access" ON cart_items;
CREATE POLICY "Service role full access" ON cart_items
  FOR ALL TO service_role USING (true);

-- orders 表
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access" ON orders;
CREATE POLICY "Service role full access" ON orders
  FOR ALL TO service_role USING (true);

-- order_items 表
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
CREATE POLICY "Users can view their order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Service role full access" ON order_items;
CREATE POLICY "Service role full access" ON order_items
  FOR ALL TO service_role USING (true);

-- ============================================
-- 5. 驗證
-- ============================================

-- 檢查 stores 表是否有 password 列
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'stores' AND column_name = 'password'
    ) 
    THEN '✅ stores.password 列已存在'
    ELSE '❌ stores.password 列不存在'
  END as status;

-- 檢查是否還有 store_products 表
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_name = 'store_products'
    ) 
    THEN '✅ store_products 表已刪除'
    ELSE '❌ store_products 表仍存在'
  END as status;

-- 檢查用戶功能表
SELECT 
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE information_schema.tables.table_name = t.table_name
  ) THEN '✅ 存在' ELSE '❌ 不存在' END as status
FROM (
  VALUES 
    ('recent_views'),
    ('favorites'),
    ('cart_items'),
    ('orders'),
    ('order_items')
) AS t(table_name);
