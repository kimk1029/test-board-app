import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 프로덕션 환경에서도 싱글톤 패턴 유지 (서버리스 환경에서 연결 풀링 문제 방지)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // 프로덕션 환경에서 연결 풀링 최적화
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// 프로덕션에서도 싱글톤 유지 (Vercel 서버리스 환경 대응)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

// 프로덕션 환경에서도 연결이 제대로 유지되도록 처리
if (process.env.NODE_ENV === 'production') {
  // 연결 풀링 최적화를 위한 설정
  prisma.$connect().catch((err) => {
    console.error('Prisma connection error:', err)
  })
}

