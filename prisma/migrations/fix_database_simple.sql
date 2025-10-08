-- ================================================
-- 简化版数据库修复脚本
-- ================================================

-- 1. 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 2. 创建 order_items 表
-- ================================================
DROP TABLE IF EXISTS order_items CASCADE;

CREATE TABLE order_items (
  id TEXT PRIMARY KEY DEFAULT ('order_item_' || gen_random_uuid()::text),
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ================================================
-- 3. 添加 orders 表缺失的列
-- ================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
    ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
    ALTER TABLE orders ADD COLUMN customer_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN
    ALTER TABLE orders ADD COLUMN customer_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_email') THEN
    ALTER TABLE orders ADD COLUMN customer_email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'note') THEN
    ALTER TABLE orders ADD COLUMN note TEXT;
  END IF;
END $$;

-- ================================================
-- 4. 创建 cart_items 表
-- ================================================
DROP TABLE IF EXISTS cart_items CASCADE;

CREATE TABLE cart_items (
  id TEXT PRIMARY KEY DEFAULT ('cart_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- ================================================
-- 5. 创建 favorites 表
-- ================================================
DROP TABLE IF EXISTS favorites CASCADE;

CREATE TABLE favorites (
  id TEXT PRIMARY KEY DEFAULT ('fav_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_store_id ON favorites(store_id);

-- ================================================
-- 6. 创建 recent_views 表（如果不存在）
-- ================================================
CREATE TABLE IF NOT EXISTS recent_views (
  id TEXT PRIMARY KEY DEFAULT ('view_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_views_user_id ON recent_views(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_views_store_id ON recent_views(store_id);

-- ================================================
-- 7. 设置 RLS 策略
-- ================================================

-- cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON cart_items;
CREATE POLICY "Allow all for service role" ON cart_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON cart_items;
CREATE POLICY "Allow all for anon" ON cart_items
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON favorites;
CREATE POLICY "Allow all for service role" ON favorites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON favorites;
CREATE POLICY "Allow all for anon" ON favorites
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- recent_views
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON recent_views;
CREATE POLICY "Allow all for service role" ON recent_views
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON recent_views;
CREATE POLICY "Allow all for anon" ON recent_views
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON order_items;
CREATE POLICY "Allow all for service role" ON order_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON order_items;
CREATE POLICY "Allow all for anon" ON order_items
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ================================================
-- 8. 完成提示
-- ================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ 数据库修复完成！';
  RAISE NOTICE '已创建的表：cart_items, favorites, recent_views, order_items';
  RAISE NOTICE '已更新的表：orders (添加了客户信息列)';
  RAISE NOTICE '已设置 RLS 策略：允许所有操作';
END $$;

