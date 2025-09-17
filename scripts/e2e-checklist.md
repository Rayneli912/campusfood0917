# E2E 檢查清單（campusfood0822）

> 目的：在本機（localStorage 模式）與未來後端模式皆可快速驗證三端（使用者 / 店家 / 管理）資料同步與關鍵商業規則。

## 0. 環境與啟動
- [ ] `.env.local` 設定：`NEXT_PUBLIC_USE_BACKEND=false`（或 true 驗證後端）
- [ ] 啟動開發伺服器後無錯誤（Console 無報錯）
- [ ] RWD：手機（≤375px）、平板（768px）、桌機（≥1280px）皆無排版崩壞

---

## 1. 單店購物車（跨店需清空提示、可選擇清空並切換）
- [ ] 在「店 A」加入商品（購物車出現品項）
- [ ] 前往「店 B」加入商品 → 出現「清空並切換」提示
- [ ] 點「清空並切換」後，購物車只含「店 B」品項
- [ ] 觸發事件 `cartUpdated` 後，其他分頁或頁面同步更新

---

## 2. 訂單編號格式
- [ ] 送出訂單 → 編號符合 `order-店家代號-YYYYMMDD-當日序號`
- [ ] 店家代號：store1→001、store2→002、store3→003、（新店家自 004 起）
- [ ] 同日多張訂單序號遞增（001→002→003…）

---

## 3. 庫存／上下架（含三端同步）
> 需使用你剛導入的 `use-inventory` 之店家端／管理端操作介面進行驗證  
> 事件：`inventoryUpdated`（{ storeId, items }）

- [ ] 店家端將某品項 `stock` 設為 **0** → `isAvailable=false`（自動下架）
- [ ] 使用者端對應品項**即刻隱藏**（售罄不顯示）
- [ ] 店家端把該品項補貨（`restock` 或 `setQuantity>0`）→ `isAvailable=true`（上架）
- [ ] 使用者端清單恢復可見
- [ ] 三端（使用者／店家／管理）對該品項 `stock` 與 `isAvailable` **一致**

---

## 4. 訂單追蹤（懸浮視窗）
- [ ] 顯示完整時間軸（送出 / 接受 / **備餐完成→10 分鐘倒數** / 完成取餐 / 取消）
- [ ] 倒數從「店家按下備餐完成」開始
- [ ] 倒數結束且未取餐 → **自動取消**並加回庫存（驗證 `inventoryUpdated` 已廣播）
- [ ] 三端狀態與庫存一致

---

## 5. 我的最愛（use-favorites）
> 事件：`favoritesUpdated`（{ userId, items }）

- [ ] 新增最愛 → 重新整理仍存在
- [ ] 取消最愛 → 重新整理後移除
- [ ] 其他分頁同步更新
- [ ] 管理端能看到相同結果（如有對應介面）

---

## 6. 近期瀏覽（use-recent-views）
> 事件：`recentViewsUpdated`（{ userId, items }）

- [ ] 連續瀏覽 25 個品項 → 僅保留最新 **20** 筆
- [ ] 重新整理仍存在
- [ ] 清空近期瀏覽 → 重新整理後維持為空
- [ ] 其他分頁同步更新

---

## 7. 退單／逾時
- [ ] 使用者主動取消 → 訂單狀態更新為「取消」，庫存回補
- [ ] 倒數逾時自動取消 → 狀態為「取消」，庫存回補
- [ ] 訂單紀錄顯示正確狀態與時間戳

---

## 8. 後端模式等價性（如已接）
> 將 `.env.local` 改為 `NEXT_PUBLIC_USE_BACKEND=true` 後重啟

- [ ] 所有功能與 localStorage 模式行為一致
- [ ] 關鍵事件仍廣播（`cartUpdated` / `orderStatusUpdated` / `inventoryUpdated` / `favoritesUpdated` / `recentViewsUpdated`）
- [ ] API 失敗時有合理錯誤提示、UI 不崩潰

---

## 快速除錯指引
- [ ] hooks 是否均改用 `lib/storage-adapter`（而非直接 `localStorage`）
- [ ] `lib/env.ts` 的 `USE_BACKEND` 與 `apiUrl()` 是否在 hooks 內統一使用
- [ ] 事件廣播名稱拼寫正確，監聽解除在 `useEffect` 的 cleanup 中處理
