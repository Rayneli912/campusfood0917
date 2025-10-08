-- ================================================
-- 修复购物车、订单、收藏功能的完整 SQL
-- ================================================

-- 1. 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 2. 创建 order_items 表（订单项目）
-- ================================================
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT ('order_item_' || gen_random_uuid()::text),
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ================================================
-- 3. 确保 orders 表有正确的列
-- ================================================
-- 检查并添加缺失的列
DO $$ 
BEGIN
  -- 添加 total_amount 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10, 2);
  END IF;

  -- 添加 customer_name 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_name TEXT;
  END IF;

  -- 添加 customer_phone 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_phone TEXT;
  END IF;

  -- 添加 customer_email 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_email TEXT;
  END IF;

  -- 添加 note 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'note'
  ) THEN
    ALTER TABLE orders ADD COLUMN note TEXT;
  END IF;
END $$;

-- ================================================
-- 4. 重新创建 cart_items 表（确保结构正确）
-- ================================================
DROP TABLE IF EXISTS cart_items CASCADE;

CREATE TABLE cart_items (
  id TEXT PRIMARY KEY DEFAULT ('cart_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- ================================================
-- 5. 重新创建 favorites 表（确保结构正确）
-- ================================================
DROP TABLE IF EXISTS favorites CASCADE;

CREATE TABLE favorites (
  id TEXT PRIMARY KEY DEFAULT ('fav_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_store_id ON favorites(store_id);

-- ================================================
-- 6. 确保 recent_views 表存在
-- ================================================
CREATE TABLE IF NOT EXISTS recent_views (
  id TEXT PRIMARY KEY DEFAULT ('view_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_views_user_id ON recent_views(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_views_store_id ON recent_views(store_id);

-- ================================================
-- 7. 设置 RLS 策略（允许所有操作）
-- ================================================

-- cart_items RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for service role" ON cart_items;
CREATE POLICY "Enable all for service role" ON cart_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON cart_items;
CREATE POLICY "Enable all for authenticated users" ON cart_items
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- favorites RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for service role" ON favorites;
CREATE POLICY "Enable all for service role" ON favorites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON favorites;
CREATE POLICY "Enable all for authenticated users" ON favorites
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- recent_views RLS
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for service role" ON recent_views;
CREATE POLICY "Enable all for service role" ON recent_views
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON recent_views;
CREATE POLICY "Enable all for authenticated users" ON recent_views
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- order_items RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for service role" ON order_items;
CREATE POLICY "Enable all for service role" ON order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON order_items;
CREATE POLICY "Enable all for authenticated users" ON order_items
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 8. 验证所有表
-- ================================================
DO $$ 
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 检查所有必要的表
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
    missing_tables := array_append(missing_tables, 'cart_items');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorites') THEN
    missing_tables := array_append(missing_tables, 'favorites');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recent_views') THEN
    missing_tables := array_append(missing_tables, 'recent_views');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
    missing_tables := array_append(missing_tables, 'order_items');
  END IF;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All tables created successfully!';
  END IF;
END $$;

-- ================================================
-- 完成
-- ================================================

