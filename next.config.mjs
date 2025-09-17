/** @type {import('next').NextConfig} */
const nextConfig = {
  // 簡化的配置，避免 webpack 別名問題
  experimental: {
    // 確保 webpack 正確處理模組
    optimizePackageImports: ['@radix-ui/react-icons'],
  },
  // 圖片域名配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cymnvkhrcatdzhvteesg.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // 確保正確的路徑解析
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default nextConfig