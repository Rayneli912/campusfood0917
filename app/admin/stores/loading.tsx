// 確保 loading 檔案存在
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StoresLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-5 w-[300px] mt-2" />
        </div>
        <div className="w-full md:w-auto">
          <Skeleton className="h-10 w-full md:w-[300px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[200px] mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-5 w-[100px]" />
                  ))}
              </div>
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-5 w-[120px]" />
                    <Skeleton className="h-5 w-[80px]" />
                    <Skeleton className="h-5 w-[100px]" />
                    <Skeleton className="h-5 w-[150px]" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[200px] mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-3 w-full">
                {Array(6)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
