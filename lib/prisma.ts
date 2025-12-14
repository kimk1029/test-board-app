import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 프로덕션 환경에서도 싱글톤 패턴 유지 (서버리스 환경에서 연결 풀링 문제 방지)
// Prisma는 자동으로 DATABASE_URL 환경 변수를 읽음
// 빌드 시점에는 환경 변수가 없을 수 있으므로 런타임에만 초기화
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// 프로덕션에서도 싱글톤 유지 (Vercel 서버리스 환경 대응)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

// 프로덕션 환경에서도 연결이 제대로 유지되도록 처리
// 빌드 시점이 아닐 때만 연결 시도 (Next.js 빌드 시에는 실행되지 않음)
// 런타임에만 연결을 시도하도록 처리
if (
  process.env.NODE_ENV === 'production' && 
  typeof window === 'undefined' &&
  !process.env.NEXT_PHASE // Next.js 빌드 단계에서는 실행 안 함
) {
  // 연결 풀링 최적화를 위한 설정
  prisma.$connect().catch((err) => {
    // 빌드 시점에는 환경 변수가 없을 수 있으므로 에러 무시
    if (process.env.DATABASE_URL) {
      console.error('Prisma connection error:', err)
    }
  })
}

