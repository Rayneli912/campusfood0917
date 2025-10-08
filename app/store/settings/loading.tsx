export default function Loading() {
  return (
    <div className="container py-6">
      <div className="mb-8">
        <div className="h-8 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <div className="h-10 w-full bg-gray-200 rounded mb-6 animate-pulse"></div>

      <div className="border rounded-lg animate-pulse">
        <div className="p-4 border-b">
          <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid gap-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t">
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}
