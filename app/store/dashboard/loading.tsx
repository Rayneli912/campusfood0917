export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded mb-2 animate-pulse"></div>
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-5 w-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 w-12 bg-gray-200 rounded mb-1"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
      <div className="h-64 w-full bg-gray-200 rounded animate-pulse"></div>
    </div>
  )
}
