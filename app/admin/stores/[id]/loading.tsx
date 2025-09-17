import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StoreDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-5 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-[100px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-20 rounded-full mx-auto" />
              <div className="space-y-3">
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

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-5 w-[100px]" />
                  ))}
              </div>
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 ml-4">
                      <Skeleton className="h-5 w-[150px]" />
                      <Skeleton className="h-4 w-[100px] mt-1" />
                    </div>
                    <Skeleton className="h-5 w-[80px]" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
