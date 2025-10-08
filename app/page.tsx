import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"
import { Leaf, BellIcon, CircleDollarSign } from "lucide-react"
import SiteCounters from "@/components/site-counters" // 直接匯入（保持它是 client component）

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo size="md" />
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="h-9 px-4 text-gray-700 dark:text-gray-300">
                登入
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="h-9 px-4 bg-primary hover:bg-primary/90">
                註冊
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* 英雄區塊 */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-green-50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-green-600">惜食快go</h1>
                <p className="text-xl text-gray-600 md:text-2xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  NSYSU 校園即期品資訊平台
                </p>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  {/* 原有兩顆按鈕維持不變 */}
                  <Link
                    href="/register"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-green-600/10 px-6 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    立即註冊
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-green-700/40 px-6 text-sm font-medium text-green-600 shadow-sm transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    登入
                  </Link>
                  {/* ✅ 新增：綠色「立即使用」，連到 /user/home */}
                  <Link
                    href="/user/home"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    立即使用
                  </Link>
                </div>
              </div>
              <div className="mx-auto w-full max-w-[500px] overflow-hidden rounded-xl shadow-xl">
                <img
                  src="/images/nsysu-campus.png"
                  alt="國立中山大學校園實景 - 惜食快go服務範圍"
                  width={500}
                  height={300}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 平台特色 */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-green-700 dark:text-green-400">
                  平台特色
                </h2>
                <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-300">
                  我們的平台提供多種功能，幫助校園內的商家和學生更有效地利用即期品。
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-3 rounded-lg border bg-card text-card-foreground shadow-sm p-6 transition-all hover:shadow-md dark:border-gray-800">
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <BellIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">即時通知</h3>
                <p className="text-sm text-gray-600 text-center dark:text-gray-300">
                  當有新的即期品上架時，立即收到通知，不錯過任何優惠。
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-lg border bg-card text-card-foreground shadow-sm p-6 transition-all hover:shadow-md dark:border-gray-800">
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <CircleDollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">優惠價格</h3>
                <p className="text-sm text-gray-600 text-center dark:text-gray-300">
                  以優惠的價格購買即期品，既省錢又減少浪費。
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-lg border bg-card text-card-foreground shadow-sm p-6 transition-all hover:shadow-md dark:border-gray-800">
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">環保貢獻</h3>
                <p className="text-sm text-gray-600 text-center dark:text-gray-300">
                  每一次預訂都是對減少食物浪費的貢獻，保護我們的環境。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 使用步驟 */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-green-700 dark:text-green-400">
                  簡單三步驟
                </h2>
                <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed dark:text-gray-300">
                  輕鬆使用平台，享受即期品優惠
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 py-12 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold">1</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">註冊帳號</h3>
                <p className="text-center text-gray-600 dark:text-gray-300">快速註冊帳號，填寫基本資料</p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold">2</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">瀏覽商品</h3>
                <p className="text-center text-gray-600 dark:text-gray-300">查看各店家提供的即期品優惠</p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold">3</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">預訂取餐</h3>
                <p className="text-center text-gray-600 dark:text-gray-300">線上預訂，到店取餐，享受優惠</p>
              </div>
            </div>
          </div>
        </section>

        {/* 站點計數器（置中堆疊，風格一致） */}
        <SiteCounters />
      </main>
    </div>
  )
}
