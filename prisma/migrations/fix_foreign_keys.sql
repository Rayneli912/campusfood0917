-- ================================================
-- 添加外键约束和修复表关系
-- ================================================

-- 1. 为 cart_items 添加外键约束
DO $$ 
BEGIN
  -- 删除旧的 cart_items 表（如果存在）
  DROP TABLE IF EXISTS cart_items CASCADE;
  
  -- 重新创建 cart_items 表，带外键约束
  CREATE TABLE cart_items (
    id TEXT PRIMARY KEY DEFAULT ('cart_' || gen_random_uuid()::text),
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id),
    -- ✅ 添加外键约束
    CONSTRAINT fk_cart_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
  CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
  
  RAISE NOTICE '✅ cart_items 表已重新创建，带外键约束';
END $$;

-- 2. 为 favorites 添加外键约束
DO $$ 
BEGIN
  -- 删除旧的 favorites 表（如果存在）
  DROP TABLE IF EXISTS favorites CASCADE;
  
  -- 重新创建 favorites 表，带外键约束
  CREATE TABLE favorites (
    id TEXT PRIMARY KEY DEFAULT ('fav_' || gen_random_uuid()::text),
    user_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, store_id),
    -- ✅ 添加外键约束
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorites_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_favorites_user_id ON favorites(user_id);
  CREATE INDEX idx_favorites_store_id ON favorites(store_id);
  
  RAISE NOTICE '✅ favorites 表已重新创建，带外键约束';
END $$;

-- 3. 为 recent_views 添加外键约束
DO $$ 
BEGIN
  -- 删除旧的 recent_views 表（如果存在）
  DROP TABLE IF EXISTS recent_views CASCADE;
  
  -- 重新创建 recent_views 表，带外键约束
  CREATE TABLE recent_views (
    id TEXT PRIMARY KEY DEFAULT ('view_' || gen_random_uuid()::text),
    user_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, store_id),
    -- ✅ 添加外键约束
    CONSTRAINT fk_recent_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_recent_views_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_recent_views_user_id ON recent_views(user_id);
  CREATE INDEX idx_recent_views_store_id ON recent_views(store_id);
  
  RAISE NOTICE '✅ recent_views 表已重新创建，带外键约束';
END $$;

-- 4. 设置 RLS 策略
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_views ENABLE ROW LEVEL SECURITY;

-- cart_items
DROP POLICY IF EXISTS "Allow all for service role" ON cart_items;
CREATE POLICY "Allow all for service role" ON cart_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON cart_items;
CREATE POLICY "Allow all for anon" ON cart_items
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- favorites
DROP POLICY IF EXISTS "Allow all for service role" ON favorites;
CREATE POLICY "Allow all for service role" ON favorites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON favorites;
CREATE POLICY "Allow all for anon" ON favorites
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- recent_views
DROP POLICY IF EXISTS "Allow all for service role" ON recent_views;
CREATE POLICY "Allow all for service role" ON recent_views
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON recent_views;
CREATE POLICY "Allow all for anon" ON recent_views
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. 验证外键约束
DO $$ 
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('cart_items', 'favorites', 'recent_views');
    
  IF fk_count >= 6 THEN
    RAISE NOTICE '✅ 所有外键约束已成功创建！(共 % 个)', fk_count;
  ELSE
    RAISE WARNING '⚠️ 外键约束数量不足：%, 预期至少 6 个', fk_count;
  END IF;
END $$;

-- 6. 完成
DO $$ 
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ 数据库修复完成！';
  RAISE NOTICE '✅ cart_items 表已重新创建，带外键约束';
  RAISE NOTICE '✅ favorites 表已重新创建，带外键约束';
  RAISE NOTICE '✅ recent_views 表已重新创建，带外键约束';
  RAISE NOTICE '✅ 所有 RLS 策略已设置';
  RAISE NOTICE '================================================';
END $$;

