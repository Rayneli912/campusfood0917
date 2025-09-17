/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 保留：可減少打包體積；不影響 UI
    optimizePackageImports: ["@radix-ui/react-icons"],
  },
  images: {
    remotePatterns: [
      // Supabase Storage（你的專案 bucket）
      {
        protocol: "https",
        hostname: "cymnvkhrcatdzhvteesg.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // 常見的頭像/隨機圖來源（若未用到也不影響）
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.jsdelivr.net", pathname: "/**" },
    ],
  },
  typescript: {
    // 維持嚴格：型別錯誤在本地就該修，不在 Vercel 忽略
    ignoreBuildErrors: false,
  },
  eslint: {
    // 建議在 CI/本地修 ESLint，Vercel build 可先略過避免「非阻擋性」錯誤中斷
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
