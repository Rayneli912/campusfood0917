# 購物車與庫存管理測試清單

## 測試環境準備
1. 確保已有測試用戶帳號登入
2. 確保有可用的店家資料和商品庫存
3. 開啟瀏覽器開發者工具監控 localStorage 變化

## 購物車數量控制測試

### 1. 基本數量操作
- [ ] 進入購物車頁面
- [ ] 點擊「+」按鈕，數量應該增加 1
- [ ] 點擊「-」按鈕，數量應該減少 1
- [ ] 當數量為 1 時點擊「-」，商品應該被移除
- [ ] 在輸入框中直接輸入數字，數量應該正確更新

### 2. 庫存限制測試
- [ ] 嘗試將數量增加到超過庫存數量
- [ ] 應該顯示「已達庫存上限」的提示
- [ ] 數量不應該超過實際庫存
- [ ] 在輸入框中輸入超過庫存的數字，應該自動調整為庫存上限

### 3. 數量計算正確性
- [ ] 檢查商品數量顯示是否正確
- [ ] 檢查小計金額計算是否正確
- [ ] 檢查總數量統計是否正確
- [ ] 檢查購物車圖示數字是否正確

## 庫存同步測試

### 1. 用戶端與店家端一致性
- [ ] 開啟兩個瀏覽器分頁：用戶端購物車 + 店家端商品管理
- [ ] 在店家端修改商品庫存
- [ ] 用戶端購物車中的庫存限制應該即時更新
- [ ] 嘗試增加數量時應該遵循新的庫存限制

### 2. 訂單處理庫存更新
- [ ] 用戶下單後，檢查商品庫存是否保持不變（下單時不扣庫存）
- [ ] 店家接受訂單後，檢查商品庫存是否正確扣除
- [ ] 在購物車中檢查該商品的可購買數量是否減少
- [ ] 店家或用戶取消訂單後，檢查庫存是否回補

### 3. 跨頁面同步
- [ ] 在店家頁面添加商品到購物車
- [ ] 切換到購物車頁面，商品應該正確顯示
- [ ] 在購物車中修改數量
- [ ] 回到店家頁面，購物車數量提示應該更新

## 邊界情況測試

### 1. 庫存為 0 的情況
- [ ] 當商品庫存為 0 時，不應該能添加到購物車
- [ ] 購物車中的商品如果庫存變為 0，應該顯示警告
- [ ] 不應該能增加數量

### 2. 多用戶競爭情況
- [ ] 模擬兩個用戶同時購買同一商品
- [ ] 先接受的訂單應該成功扣庫存
- [ ] 後接受的訂單如果庫存不足應該失敗

### 3. 錯誤處理
- [ ] 輸入非數字值時應該正確處理
- [ ] 網路錯誤時應該有適當的錯誤提示
- [ ] localStorage 損壞時應該能優雅降級

## 效能測試

### 1. 大量商品測試
- [ ] 添加 10+ 種不同商品到購物車
- [ ] 檢查數量操作是否仍然流暢
- [ ] 檢查庫存檢查是否及時

### 2. 頻繁操作測試
- [ ] 快速連續點擊 +/- 按鈕
- [ ] 檢查數量是否準確更新
- [ ] 檢查是否有競態條件問題

## 自動化測試腳本

可以在瀏覽器控制台中執行以下腳本：

```javascript
// 測試購物車數量控制
function testCartQuantityControls() {
  console.log('=== 購物車數量控制測試 ===');
  
  // 檢查購物車資料
  const userId = JSON.parse(localStorage.getItem('user'))?.id;
  if (!userId) {
    console.error('未找到登入用戶');
    return;
  }
  
  const cartKey = `user_${userId}_cart`;
  const cartItems = JSON.parse(localStorage.getItem(cartKey) || '[]');
  console.log('當前購物車商品:', cartItems);
  
  // 檢查每個商品的庫存
  cartItems.forEach(item => {
    const inventoryKey = `foodItems_${item.storeId}`;
    const inventory = JSON.parse(localStorage.getItem(inventoryKey) || '[]');
    const stockItem = inventory.find(i => i.id === item.id);
    console.log(`商品 ${item.name}:`, {
      購物車數量: item.quantity,
      庫存數量: stockItem?.quantity || 0,
      是否超量: item.quantity > (stockItem?.quantity || 0)
    });
  });
}

// 測試庫存數據完整性
function testInventoryIntegrity() {
  console.log('=== 庫存數據完整性測試 ===');
  
  // 檢查所有店家的庫存
  ['store1', 'store2', 'store3'].forEach(storeId => {
    const inventoryKey = `foodItems_${storeId}`;
    const inventory = JSON.parse(localStorage.getItem(inventoryKey) || '[]');
    console.log(`店家 ${storeId} 庫存:`, inventory.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      isListed: item.isListed
    })));
  });
}

// 模擬庫存變化
function simulateInventoryChange(storeId, itemId, newQuantity) {
  console.log(`=== 模擬庫存變化: ${storeId}/${itemId} -> ${newQuantity} ===`);
  
  const inventoryKey = `foodItems_${storeId}`;
  const inventory = JSON.parse(localStorage.getItem(inventoryKey) || '[]');
  const updatedInventory = inventory.map(item => 
    item.id === itemId ? { ...item, quantity: newQuantity } : item
  );
  
  localStorage.setItem(inventoryKey, JSON.stringify(updatedInventory));
  
  // 觸發庫存更新事件
  window.dispatchEvent(new CustomEvent('inventoryUpdated', {
    detail: { storeId, items: updatedInventory }
  }));
  
  console.log('庫存更新完成，請檢查購物車頁面是否同步更新');
}

// 執行測試
testCartQuantityControls();
testInventoryIntegrity();

// 示例：模擬店家 store1 的商品 store1-item1 庫存變為 5
// simulateInventoryChange('store1', 'store1-item1', 5);
```

## 測試結果記錄

### 通過的測試項目
- [ ] 數量加減按鈕正確運作 (+1/-1)
- [ ] 庫存限制正確生效
- [ ] 用戶端與店家端庫存同步
- [ ] 訂單處理正確扣除/回補庫存
- [ ] 跨頁面資料同步正常
- [ ] 邊界情況處理得當
- [ ] 效能表現良好

### 發現的問題
- [ ] 記錄任何發現的問題
- [ ] 標註問題嚴重程度
- [ ] 提供修復建議

### 改進建議
- [ ] UX 改進建議
- [ ] 效能優化建議
- [ ] 功能擴展建議

---

## 驗收標準

✅ **數量控制精確**：+/- 按鈕每次只改變 1 個單位
✅ **庫存限制有效**：不能購買超過庫存數量的商品
✅ **即時同步**：用戶端與店家端庫存資料保持一致
✅ **訂單處理正確**：接單扣庫存，取消回補庫存
✅ **用戶體驗良好**：操作流暢，提示清晰
✅ **錯誤處理完善**：邊界情況和錯誤狀況處理得當
