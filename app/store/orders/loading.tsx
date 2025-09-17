export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <div className="h-10 w-full bg-gray-200 rounded mb-6 animate-pulse"></div>
      <div className="h-10 w-full bg-gray-200 rounded mb-6 animate-pulse"></div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 w-full bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    </div>
  )
}
