-- 修復管理員登入問題
-- 確保 guard 管理員帳號存在且密碼正確

-- 首先刪除可能存在的舊 guard 帳號
DELETE FROM admins WHERE username = 'guard';

-- 插入新的 guard 管理員帳號（密碼: guard）
-- 密碼已經過 bcrypt 加密
INSERT INTO admins (username, password_hash, name, email)
VALUES (
  'guard', 
  '$2b$10$He2JS.3B8WDrNtz43xLcXOuT7LGA81omj2wKIXpJyE3rYJy99.7cm',
  '系統管理員',
  'admin@campusfood.com'
);

-- 驗證插入
SELECT * FROM admins WHERE username = 'guard';
