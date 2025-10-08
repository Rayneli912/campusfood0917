# 校園美食訂餐平台 (Campus Food Platform)

一個功能完整的校園餐飲訂購平台，整合 LINE Bot 通知功能，支援多角色管理（用戶、店家、管理員）。

## 專案特色

### 核心功能
- **多角色系統**：使用者、店家、管理員三種身份權限管理
- **即時訂單管理**：店家可即時接單、處理訂單狀態
- **LINE Bot 整合**：訂單狀態更新自動推送 LINE 通知
- **購物車系統**：支援多店家購物車管理
- **收藏功能**：用戶可收藏喜愛的店家和商品
- **訂單追蹤**：即時查看訂單處理進度
- **最近瀏覽**：記錄用戶瀏覽歷史
- **新聞公告**：管理員可發布平台公告與優惠資訊
- **圖片上傳**：支援商品與店家圖片管理
- **報表系統**：店家營收統計與訂單分析

### 技術架構
- **前端框架**：Next.js 15.2.4 with React 19
- **UI 組件**：Radix UI + Tailwind CSS
- **資料庫**：PostgreSQL with Prisma ORM
- **認證系統**：Supabase Auth + 自定義 Session 管理
- **狀態管理**：React Hooks + Context API
- **表單處理**：React Hook Form + Zod 驗證
- **AI 整合**：OpenAI SDK
- **部署平台**：Vercel

## 快速開始

### 環境需求
- Node.js >= 18.18
- PostgreSQL 資料庫
- Supabase 帳號
- LINE Bot 帳號（可選，用於通知功能）

### 安裝步驟

1. **安裝依賴套件**
```bash
npm install
```

2. **設定環境變數**

創建 `.env.local` 文件，並設定以下變數：

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# LINE Bot (Optional)
LINE_CHANNEL_ACCESS_TOKEN="your-line-channel-access-token"
LINE_CHANNEL_SECRET="your-line-channel-secret"

# OpenAI (Optional, for AI recommendations)
OPENAI_API_KEY="your-openai-api-key"

# Admin Credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-admin-password"
```

3. **初始化資料庫**

首先執行根目錄的 SQL 初始化檔案：
```bash
# 在 PostgreSQL 中執行
psql -d your_database < EXECUTE_THIS_SQL_FIRST.sql
```

然後執行 Prisma 遷移：
```bash
npx prisma migrate deploy
npx prisma generate
```

4. **啟動開發伺服器**
```bash
npm run dev
```

應用將在 `http://localhost:3000` 啟動

### 生產環境部署

```bash
# 建置專案（會自動執行資料庫遷移）
npm run build

# 啟動生產伺服器
npm start
```

## 部署指南

### 推送到 GitHub

#### 1. 創建 .gitignore 文件

確保專案根目錄有 `.gitignore` 文件，排除敏感和不必要的檔案：

```bash
# 如果沒有 .gitignore，創建一個
cat > .gitignore << 'EOF'
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# Typescript
*.tsbuildinfo
next-env.d.ts

# Prisma
prisma/.env
EOF
```

#### 2. 初始化 Git 並推送到 GitHub

```bash
# 初始化 Git repository
git init

# 添加所有檔案到暫存區
git add .

# 創建第一次提交
git commit -m "Initial commit: Campus Food Platform"

# 在 GitHub 上創建新的 repository（使用 GitHub CLI）
# 如果沒有安裝 GitHub CLI，請到 GitHub 網站手動創建
gh repo create campusfood-platform --private --source=. --remote=origin

# 或者手動添加遠端 repository（如果已在 GitHub 創建）
# git remote add origin https://github.com/你的用戶名/campusfood-platform.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

#### 3. 後續更新推送

```bash
# 查看變更狀態
git status

# 添加變更檔案
git add .

# 提交變更
git commit -m "描述你的變更內容"

# 推送到 GitHub
git push origin main
```

### 部署到 Vercel

#### 方法一：使用 Vercel CLI（推薦）

1. **安裝 Vercel CLI**

```bash
npm install -g vercel
```

2. **登入 Vercel**

```bash
vercel login
```

3. **首次部署**

```bash
# 在專案根目錄執行
vercel

# 按照提示操作：
# - Set up and deploy? Yes
# - Which scope? 選擇你的帳號
# - Link to existing project? No
# - What's your project's name? campusfood-platform
# - In which directory is your code located? ./
# - Want to override the settings? No
```

4. **部署到生產環境**

```bash
vercel --prod
```

#### 方法二：使用 Vercel Dashboard（簡單）

1. **前往 Vercel 網站**
   - 訪問 [https://vercel.com](https://vercel.com)
   - 使用 GitHub 帳號登入

2. **導入 GitHub Repository**
   - 點擊 "Add New..." → "Project"
   - 選擇 "Import Git Repository"
   - 授權 Vercel 存取你的 GitHub
   - 選擇 `campusfood-platform` repository
   - 點擊 "Import"

3. **配置專案設定**

   **Framework Preset**: Next.js
   
   **Build Command**: 
   ```bash
   npm run build
   ```
   
   **Output Directory**: `.next`
   
   **Install Command**: 
   ```bash
   npm install
   ```

4. **設定環境變數**

   在 "Environment Variables" 區塊添加以下變數：

   ```
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   LINE_CHANNEL_ACCESS_TOKEN=your-line-token (optional)
   LINE_CHANNEL_SECRET=your-line-secret (optional)
   OPENAI_API_KEY=your-openai-key (optional)
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   ```

   ⚠️ **重要**：
   - 為每個環境（Production, Preview, Development）分別設定
   - 生產環境使用強密碼
   - DATABASE_URL 建議使用連接池（如 Supabase 的 Pooler URL）

5. **部署**
   - 點擊 "Deploy"
   - 等待部署完成（約 2-5 分鐘）
   - 部署成功後會獲得專屬網址：`https://your-project.vercel.app`

### 配置 Vercel 進階設定

#### 設定自訂網域

1. 進入專案的 "Settings" → "Domains"
2. 添加你的網域名稱
3. 按照指示設定 DNS 記錄

#### 設定環境變數管理

```bash
# 使用 Vercel CLI 設定環境變數
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# 查看環境變數
vercel env ls

# 拉取環境變數到本地（建立 .env.local）
vercel env pull .env.local
```

#### 設定自動部署

Vercel 會自動設定：
- **Production Branch**: `main` 分支的推送會自動部署到生產環境
- **Preview Deployments**: 其他分支和 PR 會創建預覽部署
- **自動 HTTPS**: 自動配置 SSL 憑證

#### 監控與日誌

1. **查看部署日誌**
   - 在 Vercel Dashboard 點擊專案
   - 進入 "Deployments" 查看每次部署的詳細日誌

2. **查看運行日誌**
   ```bash
   # 使用 CLI 查看即時日誌
   vercel logs https://your-project.vercel.app
   ```

3. **設定通知**
   - Settings → Notifications
   - 可設定部署失敗時的 Email/Slack 通知

### 設定 LINE Webhook

部署完成後，更新 LINE Bot 的 Webhook URL：

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 選擇你的 Messaging API Channel
3. 在 "Messaging API" 標籤下設定 Webhook URL：
   ```
   https://your-project.vercel.app/api/line/webhook
   ```
4. 開啟 "Use webhook" 選項
5. 點擊 "Verify" 測試連線

### 資料庫設定注意事項

#### Supabase 連線設定

使用 Supabase 時，建議使用連接池以避免連線數超限：

```env
# Session Mode (適用於 Serverless)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"

# Direct Connection (用於 Prisma Migrate)
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

#### Vercel Postgres（替代方案）

如果想使用 Vercel 的 Postgres：

1. 在 Vercel Dashboard 點擊 "Storage"
2. 創建新的 Postgres 資料庫
3. Vercel 會自動注入環境變數
4. 執行資料庫遷移：
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

### 持續整合/持續部署 (CI/CD)

Vercel 預設提供完整的 CI/CD 流程：

1. **Pull Request 預覽**
   - 每個 PR 自動創建預覽部署
   - 在 PR 中直接測試變更

2. **自動部署流程**
   ```
   開發 → 提交 → 推送到 GitHub → Vercel 自動偵測 → 建置 → 部署 → 通知
   ```

3. **回滾機制**
   - 在 Deployments 頁面可快速回滾到先前版本
   - 或使用 CLI：
     ```bash
     vercel rollback
     ```

### 性能優化建議

1. **圖片優化**
   - 使用 Next.js Image 組件（已內建）
   - Vercel 會自動優化圖片

2. **啟用 ISR (Incremental Static Regeneration)**
   - 對靜態內容使用 revalidate

3. **設定快取策略**
   - 在 `next.config.mjs` 配置快取標頭

4. **監控效能**
   - 使用 Vercel Analytics
   - 在 Settings → Analytics 啟用

## 專案結構

```
campusfood1002/
├── app/                      # Next.js App Router
│   ├── admin/               # 管理員介面
│   ├── store/               # 店家介面
│   ├── user/                # 使用者介面
│   └── api/                 # API 路由
├── components/              # React 組件
│   ├── ui/                  # 基礎 UI 組件
│   └── ...                  # 業務組件
├── lib/                     # 核心邏輯
│   ├── db/                  # 資料庫服務
│   ├── supabase/            # Supabase 客戶端
│   └── ...                  # 其他服務層
├── hooks/                   # React Hooks
├── prisma/                  # Prisma 設定與遷移
├── public/                  # 靜態資源
└── types/                   # TypeScript 類型定義
```

## 使用說明

### 使用者端
1. 註冊/登入帳號
2. 瀏覽店家與商品
3. 加入購物車
4. 送出訂單
5. 追蹤訂單狀態
6. 接收 LINE 通知（需綁定 LINE）

### 店家端
1. 註冊店家帳號（需管理員審核）
2. 管理商品資訊
3. 接收訂單通知
4. 處理訂單（確認/準備/完成/取消）
5. 查看營收報表

### 管理員端
1. 審核店家申請
2. 管理使用者帳號
3. 發布平台公告
4. 查看平台統計數據
5. 處理客服問題

## API 端點

### 認證 API
- `POST /api/auth/user/register` - 用戶註冊
- `POST /api/auth/user/login` - 用戶登入
- `POST /api/auth/store/register` - 店家註冊
- `POST /api/auth/store/login` - 店家登入
- `POST /api/auth/admin/login` - 管理員登入

### 訂單 API
- `GET /api/orders` - 查詢訂單
- `POST /api/orders` - 建立訂單
- `GET /api/orders/[id]` - 訂單詳情
- `PATCH /api/orders/[id]` - 更新訂單狀態

### 商品 API
- `GET /api/user/products` - 用戶商品列表
- `GET /api/store/products` - 店家商品管理
- `POST /api/store/products` - 新增商品
- `PATCH /api/store/products` - 更新商品

### 其他 API
- `GET /api/cart` - 購物車
- `GET /api/favorites` - 收藏清單
- `GET /api/news` - 新聞公告
- `POST /api/upload/image` - 圖片上傳

## 資料庫架構

主要資料表：
- **stores** - 店家資料
- **orders** - 訂單
- **order_items** - 訂單項目
- **line_user_settings** - LINE 用戶設定
- **site_counters** - 網站統計

詳細 schema 請參考 `prisma/schema.prisma`

## 開發注意事項

1. **環境變數**：絕不提交 `.env.local` 到版本控制
2. **資料庫遷移**：修改 schema 後執行 `npx prisma migrate dev`
3. **型別安全**：使用 TypeScript 嚴格模式
4. **代碼規範**：遵循 ESLint 規則
5. **性能優化**：使用 React.memo 和 useMemo 避免不必要的重渲染

## 疑難排解

### 資料庫連線問題
確認 `DATABASE_URL` 和 `DIRECT_URL` 設定正確，並確保資料庫服務正在運行。

### Supabase 認證錯誤
檢查 Supabase 專案設定，確保 URL 和 API Keys 正確無誤。

### LINE Bot 通知失敗
確認 LINE Channel Access Token 有效，並檢查 webhook 設定。

### Build 錯誤
如遇到資料庫連線問題，可使用 `npm run build:skip-db` 跳過資料庫遷移。

## 授權

Private - All Rights Reserved

## 聯絡資訊

如有問題或建議，請聯繫專案維護者。

---

**最後更新**: 2025年10月

