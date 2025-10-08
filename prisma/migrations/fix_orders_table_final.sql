-- ================================================
-- 修复 orders 表结构（最终版本）
-- ================================================

-- 1. 检查并修改 orders 表，确保字段匹配
DO $$ 
BEGIN
  -- 添加 store_name 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'store_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN store_name TEXT;
    RAISE NOTICE '✅ 添加 store_name 列';
  END IF;

  -- 添加 store_location 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'store_location'
  ) THEN
    ALTER TABLE orders ADD COLUMN store_location TEXT;
    RAISE NOTICE '✅ 添加 store_location 列';
  END IF;

  -- 添加 total 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'total'
  ) THEN
    ALTER TABLE orders ADD COLUMN total DECIMAL(10, 2);
    RAISE NOTICE '✅ 添加 total 列';
  END IF;

  -- 添加 customer_info 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_info'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_info JSONB;
    RAISE NOTICE '✅ 添加 customer_info 列';
  END IF;

  -- 添加 note 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'note'
  ) THEN
    ALTER TABLE orders ADD COLUMN note TEXT;
    RAISE NOTICE '✅ 添加 note 列';
  END IF;

  -- 删除可能冲突的旧列
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    -- 如果 total 列存在且有值，不删除 total_amount
    -- 如果 total 列为空，从 total_amount 复制数据
    EXECUTE '
      UPDATE orders 
      SET total = total_amount 
      WHERE total IS NULL AND total_amount IS NOT NULL
    ';
    RAISE NOTICE '✅ 从 total_amount 复制数据到 total';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    -- 迁移旧的客户信息字段到 JSONB
    EXECUTE '
      UPDATE orders 
      SET customer_info = jsonb_build_object(
        ''name'', COALESCE(customer_name, ''''),
        ''phone'', COALESCE(customer_phone, ''''),
        ''email'', COALESCE(customer_email, '''')
      )
      WHERE customer_info IS NULL 
        AND (customer_name IS NOT NULL OR customer_phone IS NOT NULL OR customer_email IS NOT NULL)
    ';
    RAISE NOTICE '✅ 迁移客户信息到 customer_info JSONB';
  END IF;
END $$;

-- 2. 设置 NOT NULL 约束（在有数据的情况下）
DO $$ 
BEGIN
  -- 如果 store_name 列存在但没有 NOT NULL 约束，添加它
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
      AND column_name = 'store_name'
      AND is_nullable = 'YES'
  ) THEN
    -- 先更新空值
    UPDATE orders SET store_name = '未知店家' WHERE store_name IS NULL;
    -- 添加 NOT NULL 约束
    ALTER TABLE orders ALTER COLUMN store_name SET NOT NULL;
    RAISE NOTICE '✅ store_name 设置为 NOT NULL';
  END IF;

  -- 如果 total 列存在但没有 NOT NULL 约束，添加它
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
      AND column_name = 'total'
      AND is_nullable = 'YES'
  ) THEN
    -- 先更新空值
    UPDATE orders SET total = 0 WHERE total IS NULL;
    -- 添加 NOT NULL 约束
    ALTER TABLE orders ALTER COLUMN total SET NOT NULL;
    RAISE NOTICE '✅ total 设置为 NOT NULL';
  END IF;
END $$;

-- 3. 确保 order_items 表结构正确
DO $$ 
BEGIN
  -- 检查 order_items 表是否需要 product_name 列
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'product_name'
  ) THEN
    -- 如果有 name 列，重命名为 product_name
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'order_items' AND column_name = 'name'
    ) THEN
      ALTER TABLE order_items RENAME COLUMN name TO product_name;
      RAISE NOTICE '✅ 重命名 order_items.name 为 product_name';
    ELSE
      ALTER TABLE order_items ADD COLUMN product_name TEXT NOT NULL DEFAULT '未知商品';
      RAISE NOTICE '✅ 添加 order_items.product_name 列';
    END IF;
  END IF;

  -- 确保 product_id 列存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE order_items ADD COLUMN product_id TEXT;
    RAISE NOTICE '✅ 添加 order_items.product_id 列';
  END IF;
END $$;

-- 4. 验证表结构
DO $$ 
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  orders_columns TEXT;
  order_items_columns TEXT;
BEGIN
  -- 检查 orders 表的必需列
  SELECT string_agg(column_name, ', ') INTO orders_columns
  FROM information_schema.columns
  WHERE table_name = 'orders'
    AND column_name IN ('id', 'user_id', 'store_id', 'store_name', 'total', 'status', 'customer_info', 'note');
  
  -- 检查 order_items 表的必需列
  SELECT string_agg(column_name, ', ') INTO order_items_columns
  FROM information_schema.columns
  WHERE table_name = 'order_items'
    AND column_name IN ('id', 'order_id', 'product_id', 'product_name', 'price', 'quantity');
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ 数据库修复完成！';
  RAISE NOTICE '✅ orders 表列: %', orders_columns;
  RAISE NOTICE '✅ order_items 表列: %', order_items_columns;
  RAISE NOTICE '================================================';
END $$;

-- 5. 显示当前表结构
SELECT 
  'orders' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('id', 'user_id', 'store_id', 'store_name', 'total', 'status', 'customer_info', 'note')
ORDER BY ordinal_position

UNION ALL

SELECT 
  'order_items' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('id', 'order_id', 'product_id', 'product_name', 'price', 'quantity')
ORDER BY ordinal_position;

