-- ================================================================
-- 添加增加瀏覽次數的 RPC 函數
-- ================================================================
-- 
-- 這個函數可以原子性地增加瀏覽次數，避免併發問題
-- 
-- ================================================================

CREATE OR REPLACE FUNCTION increment_views()
RETURNS void AS $$
BEGIN
  UPDATE site_counters 
  SET views = views + 1,
      updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予 public 執行權限
GRANT EXECUTE ON FUNCTION increment_views() TO PUBLIC;

-- 測試函數
SELECT increment_views();
SELECT views FROM site_counters WHERE id = 1;

