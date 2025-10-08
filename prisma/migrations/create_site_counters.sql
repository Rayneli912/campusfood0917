-- ================================================================
-- 網站計數器功能 - 資料庫結構
-- ================================================================
-- 
-- 執行方式：
-- 1. 登入 Supabase Dashboard (https://app.supabase.com)
-- 2. 選擇專案：惜食快go's Project
-- 3. 點擊左側 SQL Editor
-- 4. 複製此檔案全部內容並貼上
-- 5. 點擊 Run 執行
-- 
-- ================================================================

-- 1. 創建 site_counters 表（網站計數器）
CREATE TABLE IF NOT EXISTS site_counters (
  id INTEGER PRIMARY KEY DEFAULT 1,
  views BIGINT NOT NULL DEFAULT 0,
  waste_saved BIGINT NOT NULL DEFAULT 0,
  calc_mode TEXT NOT NULL DEFAULT 'manual' CHECK (calc_mode IN ('manual', 'completedOrders')),
  waste_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 確保只有一筆資料
  CONSTRAINT single_row CHECK (id = 1)
);

-- 2. 插入初始資料（如果不存在）
INSERT INTO site_counters (id, views, waste_saved, calc_mode, waste_offset, updated_at)
VALUES (1, 0, 0, 'manual', 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. 創建更新時間觸發器函數
CREATE OR REPLACE FUNCTION update_site_counters_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 創建觸發器（自動更新 updated_at）
DROP TRIGGER IF EXISTS set_updated_at ON site_counters;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON site_counters
  FOR EACH ROW
  EXECUTE FUNCTION update_site_counters_timestamp();

-- 5. 創建索引
CREATE INDEX IF NOT EXISTS idx_site_counters_updated_at ON site_counters(updated_at);

-- 6. 啟用 Row Level Security (RLS)
ALTER TABLE site_counters ENABLE ROW LEVEL SECURITY;

-- 7. 創建策略：所有人可讀
CREATE POLICY "Allow public read access on site_counters"
  ON site_counters
  FOR SELECT
  USING (true);

-- 8. 創建策略：所有人可更新（因為前端需要增加瀏覽次數）
CREATE POLICY "Allow public update access on site_counters"
  ON site_counters
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 9. 驗證結果
SELECT 
  id,
  views as "網站瀏覽次數",
  waste_saved as "減少糧食浪費次數",
  calc_mode as "計算模式",
  waste_offset as "偏移量",
  updated_at as "最後更新時間"
FROM site_counters;

-- ================================================================
-- 使用說明
-- ================================================================
-- 
-- 查詢計數器：
-- SELECT * FROM site_counters;
-- 
-- 增加瀏覽次數：
-- UPDATE site_counters SET views = views + 1 WHERE id = 1;
-- 
-- 手動設定數值：
-- UPDATE site_counters 
-- SET views = 1000, waste_saved = 500, calc_mode = 'manual' 
-- WHERE id = 1;
-- 
-- 切換到自動模式（根據完成訂單數）：
-- UPDATE site_counters 
-- SET calc_mode = 'completedOrders', waste_offset = 100 
-- WHERE id = 1;
-- 
-- ================================================================

