import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const userId = payload.userId

  try {
    // 1. 유저 정보
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, level: true, nickname: true, email: true, createdAt: true }
    })

    // 2. 게임별 통계
    const stats = await prisma.gameLog.groupBy({
      by: ['gameType'],
      where: { userId },
      _count: { _all: true },
      _sum: { profit: true, betAmount: true, payout: true },
    })

    // 승리 횟수 별도 조회 (result가 'WIN', 'JACKPOT', 'BLACKJACK' 등인 경우)
    // Prisma groupBy는 having 지원이 제한적이므로 별도 조회 후 병합
    const winCounts = await prisma.gameLog.groupBy({
      by: ['gameType'],
      where: { 
        userId, 
        result: { in: ['WIN', 'JACKPOT', 'BLACKJACK', 'win', 'blackjack'] } // 대소문자 혼용 주의
      },
      _count: { _all: true }
    })

    const mergedStats = stats.map(stat => {
        const winStat = winCounts.find(w => w.gameType === stat.gameType);
        const wins = winStat?._count._all || 0;
        const total = stat._count._all;
        return {
            gameType: stat.gameType,
            totalGames: total,
            wins,
            winRate: total > 0 ? (wins / total * 100).toFixed(1) : 0,
            totalProfit: stat._sum.profit || 0,
            totalBet: stat._sum.betAmount || 0,
            totalPayout: stat._sum.payout || 0
        };
    });

    // 3. 일자별 수익 (최근 30일)
    const dailyProfits: any[] = await prisma.$queryRaw`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as date, SUM(profit) as profit
      FROM "GameLog"
      WHERE "userId" = ${userId}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
      ORDER BY date ASC
      LIMIT 30
    `;

    // 4. 쿠지 당첨 내역
    // metadata가 있는 로그만 가져와서 JS로 집계
    const kujiLogs = await prisma.gameLog.findMany({
        where: { 
            userId, 
            gameType: 'kuji',
            result: 'WIN' 
        },
        select: { metadata: true },
        take: 1000 // 너무 많으면 성능 이슈, 적당히 제한
    });

    const kujiRankCounts: Record<string, number> = {};
    kujiLogs.forEach(log => {
        if (log.metadata && typeof log.metadata === 'object' && 'rank' in log.metadata) {
            const rank = (log.metadata as any).rank as string;
            kujiRankCounts[rank] = (kujiRankCounts[rank] || 0) + 1;
        }
    });

    // 5. 업적 목록
    const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true }
    });

    return NextResponse.json({
        user,
        gameStats: mergedStats,
        dailyStats: dailyProfits,
        kujiStats: kujiRankCounts,
        achievements: userAchievements
    })

  } catch (error) {
    console.error('Stats API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

