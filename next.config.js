/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  typescript: {
    // Vercel 빌드 시 타입 오류가 있어도 빌드를 계속 진행 (선택사항)
    // ignoreBuildErrors: false, // 기본값은 false (타입 오류 시 빌드 실패)
  },
  eslint: {
    // Vercel 빌드 시 ESLint 오류가 있어도 빌드를 계속 진행 (선택사항)
    // ignoreDuringBuilds: false, // 기본값은 false
  },
}

module.exports = nextConfig
