-- 添加訂單取消相關欄位
-- 2025-01-07

-- 添加取消原因欄位
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 添加索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_prepared_at ON orders(prepared_at);
CREATE INDEX IF NOT EXISTS idx_orders_store_id_status ON orders(store_id, status);

COMMENT ON COLUMN orders.reason IS '取消或拒絕原因';
COMMENT ON COLUMN orders.cancelled_by IS '取消發起方：user, store, system';
COMMENT ON COLUMN orders.rejected_at IS '訂單被店家拒絕的時間';
COMMENT ON COLUMN orders.cancelled_at IS '訂單被取消的時間';

