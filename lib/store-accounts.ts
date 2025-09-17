// 預設店家帳號
export const storeAccounts = [
  {
    id: "1",
    storeId: "store1",
    storeName: "中央餐廳",
    category: "學生餐廳",
    description: "提供多種餐點選擇，每日特餐與即期品優惠",
    location: "學生活動中心1樓",
    contact: "02-2771-1234",
    username: "store1",
    password: "store1",
  },
  {
    id: "2",
    storeId: "store2",
    storeName: "校園超商",
    category: "便利商店",
    description: "各式飲料、麵包、便當等即期品優惠",
    location: "第一教學大樓1樓",
    contact: "02-2731-2345",
    username: "store2",
    password: "store2",
  },
  {
    id: "3",
    storeId: "store3",
    storeName: "知識咖啡",
    category: "咖啡廳",
    description: "提供咖啡、輕食、甜點，閉店前特價",
    location: "圖書館1樓",
    contact: "02-2711-4567",
    username: "store3",
    password: "store3",
  },
]

export type StoreAccount = {
  id: string
  storeId: string
  storeName: string
  category: string
  description: string
  location: string
  contact: string
  username: string
  password: string
}
