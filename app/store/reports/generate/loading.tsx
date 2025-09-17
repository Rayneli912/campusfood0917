export default function Loading() {
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <div className="h-10 w-24 bg-gray-200 rounded mr-4 animate-pulse"></div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
      </div>

      <div className="border rounded-lg mb-6 animate-pulse">
        <div className="p-4 border-b">
          <div className="h-6 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-10 w-full bg-gray-200 rounded"></div>
            <div className="h-10 w-full bg-gray-200 rounded"></div>
            <div className="h-10 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4 animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 w-16 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-10 w-full bg-gray-200 rounded mb-6 animate-pulse"></div>
        <div className="h-[300px] w-full bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  )
}
