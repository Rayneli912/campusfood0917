-- ============================================
-- 修復 Supabase Storage RLS 策略
-- ============================================

-- 刪除所有現有的 storage.objects 策略
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;

-- ============================================
-- 創建新的寬鬆策略（適用於測試環境）
-- ============================================

-- 1. 允許所有人讀取 product-images bucket 中的文件
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 2. 允許所有人上傳到 product-images bucket（測試用）
CREATE POLICY "Anyone can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- 3. 允許所有人更新 product-images bucket 中的文件
CREATE POLICY "Anyone can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- 4. 允許所有人刪除 product-images bucket 中的文件
CREATE POLICY "Anyone can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- ============================================
-- 驗證
-- ============================================

-- 查看 storage.objects 的所有策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
