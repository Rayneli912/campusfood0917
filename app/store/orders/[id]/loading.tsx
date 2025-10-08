export default function Loading() {
  return (
    <div className="container py-6">
      <div className="animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
        <div className="h-12 w-3/4 bg-gray-200 rounded mb-6"></div>
        <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
      </div>
    </div>
  )
}
