-- ============================================
-- 完整的用户功能表（购物车、收藏、近期浏览）
-- ============================================

-- 1. 购物车表
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY DEFAULT ('cart_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 2. 收藏表（如果不存在）
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY DEFAULT ('fav_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

-- 3. 近期浏览表（如果不存在）
CREATE TABLE IF NOT EXISTS recent_views (
  id TEXT PRIMARY KEY DEFAULT ('view_' || gen_random_uuid()::text),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

-- 4. 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_store_id ON favorites(store_id);
CREATE INDEX IF NOT EXISTS idx_recent_views_user_id ON recent_views(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_views_viewed_at ON recent_views(viewed_at DESC);

-- 5. RLS 策略
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

-- Service role 完全访问
DROP POLICY IF EXISTS "Service role full access" ON cart_items;
CREATE POLICY "Service role full access" ON cart_items
  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access" ON favorites;
CREATE POLICY "Service role full access" ON favorites
  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access" ON recent_views;
CREATE POLICY "Service role full access" ON recent_views
  FOR ALL TO service_role USING (true);

-- 6. 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cart_items_updated_at ON cart_items;
CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();

-- 7. 验证
SELECT 'cart_items' as table_name, COUNT(*) as count FROM cart_items
UNION ALL
SELECT 'favorites', COUNT(*) FROM favorites
UNION ALL
SELECT 'recent_views', COUNT(*) FROM recent_views;

