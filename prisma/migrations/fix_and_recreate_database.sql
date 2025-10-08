-- ================================================================
-- 修復並重新創建資料庫
-- ================================================================
-- 
-- 此腳本會：
-- 1. 刪除所有現有的表（如果存在）
-- 2. 重新創建所有表
-- 
-- 執行方式：
-- 1. 登入 Supabase Dashboard (https://app.supabase.com)
-- 2. 選擇專案：惜食快go's Project
-- 3. 點擊左側 SQL Editor
-- 4. 複製此檔案全部內容並貼上
-- 5. 點擊 Run 執行
-- 
-- ================================================================

-- ================================================================
-- 第一步：刪除所有現有的表（如果存在）
-- ================================================================

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS store_settings CASCADE;
DROP TABLE IF EXISTS store_products CASCADE;
DROP TABLE IF EXISTS pending_stores CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS user_cart_items CASCADE;
DROP TABLE IF EXISTS user_recent_views CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 刪除函數（如果存在）
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS generate_store_code CASCADE;
DROP FUNCTION IF EXISTS auto_generate_store_code CASCADE;

-- ================================================================
-- 第二步：創建所有表
-- ================================================================

-- 1. 用戶基本資料表
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT ('user_' || gen_random_uuid()::text),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  department TEXT,
  student_id TEXT,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 用戶個人資料表
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  address TEXT,
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "orderUpdates": true, "promotions": true}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 用戶我的最愛表
CREATE TABLE user_favorites (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('store', 'product')),
  store_id TEXT,
  store_name TEXT,
  name TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id, item_type)
);

-- 4. 用戶近期瀏覽表
CREATE TABLE user_recent_views (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('store', 'product')),
  store_id TEXT,
  store_name TEXT,
  name TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC(10, 2),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id, item_type)
);

-- 5. 用戶購物車表
CREATE TABLE user_cart_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id, store_id)
);

-- 6. 店家基本資料表
CREATE TABLE stores (
  id TEXT PRIMARY KEY DEFAULT ('store_' || gen_random_uuid()::text),
  store_code TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  category TEXT DEFAULT '其他',
  business_hours TEXT DEFAULT '週一至週五 09:00-18:00',
  cover_image TEXT,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. 待審核店家表
CREATE TABLE pending_stores (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. 店家商品表
CREATE TABLE store_products (
  id TEXT PRIMARY KEY DEFAULT ('product_' || gen_random_uuid()::text),
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  image_url TEXT,
  category TEXT DEFAULT '其他',
  expiry_date TIMESTAMPTZ,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. 店家設定表
CREATE TABLE store_settings (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  notifications JSONB DEFAULT '{"newOrder": true, "orderStatus": true, "systemUpdates": true}'::jsonb,
  display JSONB DEFAULT '{"showOutOfStock": false, "showSoldCount": true}'::jsonb,
  business_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. 訂單主表
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_location TEXT,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'prepared', 'completed', 'cancelled', 'rejected', 'expired')),
  customer_info JSONB,
  note TEXT,
  cancellation_reason TEXT,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. 訂單明細表
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  food_item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 第三步：創建索引
-- ================================================================

-- 用戶相關索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_item_id ON user_favorites(item_id);
CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at DESC);

CREATE INDEX idx_user_recent_views_user_id ON user_recent_views(user_id);
CREATE INDEX idx_user_recent_views_viewed_at ON user_recent_views(viewed_at DESC);

CREATE INDEX idx_user_cart_items_user_id ON user_cart_items(user_id);
CREATE INDEX idx_user_cart_items_store_id ON user_cart_items(store_id);

-- 店家相關索引
CREATE INDEX idx_stores_username ON stores(username);
CREATE INDEX idx_stores_store_code ON stores(store_code);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_created_at ON stores(created_at);

CREATE INDEX idx_pending_stores_username ON pending_stores(username);
CREATE INDEX idx_pending_stores_applied_at ON pending_stores(applied_at DESC);

CREATE INDEX idx_store_products_store_id ON store_products(store_id);
CREATE INDEX idx_store_products_is_available ON store_products(is_available);
CREATE INDEX idx_store_products_created_at ON store_products(created_at DESC);

-- 訂單相關索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_food_item_id ON order_items(food_item_id);

-- ================================================================
-- 第四步：創建觸發器函數
-- ================================================================

-- 更新 updated_at 的觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為所有需要的表添加 updated_at 觸發器
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_user_cart_items
  BEFORE UPDATE ON user_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_stores
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_store_products
  BEFORE UPDATE ON store_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_store_settings
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 第五步：啟用 Row Level Security (RLS)
-- ================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recent_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 第六步：創建 RLS 策略
-- ================================================================

-- 用戶表策略
CREATE POLICY "Users are publicly readable" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can be created by anyone" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

-- 用戶個人資料策略
CREATE POLICY "User profiles are publicly readable" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "User profiles can be created by anyone" ON user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "User profiles can be updated" ON user_profiles
  FOR UPDATE USING (true);

-- 用戶我的最愛策略
CREATE POLICY "Favorites are publicly readable" ON user_favorites
  FOR SELECT USING (true);

CREATE POLICY "Favorites can be created" ON user_favorites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Favorites can be deleted" ON user_favorites
  FOR DELETE USING (true);

-- 用戶近期瀏覽策略
CREATE POLICY "Recent views are publicly readable" ON user_recent_views
  FOR SELECT USING (true);

CREATE POLICY "Recent views can be created" ON user_recent_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Recent views can be updated" ON user_recent_views
  FOR UPDATE USING (true);

CREATE POLICY "Recent views can be deleted" ON user_recent_views
  FOR DELETE USING (true);

-- 用戶購物車策略
CREATE POLICY "Cart items are publicly readable" ON user_cart_items
  FOR SELECT USING (true);

CREATE POLICY "Cart items can be created" ON user_cart_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Cart items can be updated" ON user_cart_items
  FOR UPDATE USING (true);

CREATE POLICY "Cart items can be deleted" ON user_cart_items
  FOR DELETE USING (true);

-- 店家表策略
CREATE POLICY "Stores are publicly readable" ON stores
  FOR SELECT USING (true);

CREATE POLICY "Stores can be created" ON stores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Stores can be updated" ON stores
  FOR UPDATE USING (true);

-- 待審核店家策略
CREATE POLICY "Pending stores are publicly readable" ON pending_stores
  FOR SELECT USING (true);

CREATE POLICY "Pending stores can be created" ON pending_stores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Pending stores can be deleted" ON pending_stores
  FOR DELETE USING (true);

-- 店家商品策略
CREATE POLICY "Store products are publicly readable" ON store_products
  FOR SELECT USING (true);

CREATE POLICY "Store products can be created" ON store_products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Store products can be updated" ON store_products
  FOR UPDATE USING (true);

CREATE POLICY "Store products can be deleted" ON store_products
  FOR DELETE USING (true);

-- 店家設定策略
CREATE POLICY "Store settings are publicly readable" ON store_settings
  FOR SELECT USING (true);

CREATE POLICY "Store settings can be created" ON store_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Store settings can be updated" ON store_settings
  FOR UPDATE USING (true);

-- 訂單策略
CREATE POLICY "Orders are publicly readable" ON orders
  FOR SELECT USING (true);

CREATE POLICY "Orders can be created" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Orders can be updated" ON orders
  FOR UPDATE USING (true);

-- 訂單明細策略
CREATE POLICY "Order items are publicly readable" ON order_items
  FOR SELECT USING (true);

CREATE POLICY "Order items can be created" ON order_items
  FOR INSERT WITH CHECK (true);

-- ================================================================
-- 第七步：創建輔助函數
-- ================================================================

-- 生成店家代號函數
CREATE OR REPLACE FUNCTION generate_store_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM stores;
  new_code := 'S' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 自動生成店家代號的觸發器
CREATE OR REPLACE FUNCTION auto_generate_store_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.store_code IS NULL OR NEW.store_code = '' THEN
    NEW.store_code := generate_store_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_store_code
  BEFORE INSERT ON stores
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_store_code();

-- ================================================================
-- 第八步：插入測試數據
-- ================================================================

-- 插入測試用戶
INSERT INTO users (id, username, password, name, email, phone, department, student_id, is_disabled, created_at)
VALUES 
  ('user_test1', 'testuser1', 'password123', '測試用戶1', 'test1@example.com', '0912345678', '資訊管理學系', 'B1234567', false, NOW()),
  ('user_test2', 'testuser2', 'password123', '測試用戶2', 'test2@example.com', '0923456789', '電機工程學系', 'B2345678', false, NOW())
ON CONFLICT (username) DO NOTHING;

-- 為測試用戶創建個人資料
INSERT INTO user_profiles (user_id, notification_settings, created_at)
VALUES 
  ('user_test1', '{"email": true, "push": true, "orderUpdates": true, "promotions": true}'::jsonb, NOW()),
  ('user_test2', '{"email": true, "push": true, "orderUpdates": true, "promotions": false}'::jsonb, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- ================================================================
-- 第九步：驗證結果
-- ================================================================

-- 查看所有表
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users', 'user_profiles', 'user_favorites', 'user_recent_views', 'user_cart_items',
  'stores', 'pending_stores', 'store_products', 'store_settings',
  'orders', 'order_items'
)
ORDER BY tablename;

-- 查看記錄數
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'stores' as table_name, COUNT(*) as count FROM stores
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as count FROM orders;

-- ================================================================
-- 完成！
-- ================================================================

SELECT '✅ 資料庫創建完成！' as status,
       '所有表、索引、觸發器和策略都已成功創建' as message;

