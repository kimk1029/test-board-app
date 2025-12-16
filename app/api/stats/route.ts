import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic' // 캐싱 방지

export async function GET() {
  try {
    // 1. 전체 요약 (개별 try-catch로 처리)
    let totalGames = 0
    let winGames = 0
    let totalBet = 0
    let totalPayout = 0
    let totalProfit = 0
    let avgMultiplier = 0

    try {
      totalGames = await prisma.gameLog.count()
    } catch (e) {
      console.error('Total games count error:', e)
    }

    try {
      winGames = await prisma.gameLog.count({
        where: {
          result: { in: ['WIN', 'BLACKJACK', 'JACKPOT'] }
        }
      })
    } catch (e) {
      console.error('Win games count error:', e)
    }

    try {
      const aggregations = await prisma.gameLog.aggregate({
        _sum: {
          betAmount: true,
          payout: true,
          profit: true
        },
        _avg: {
          multiplier: true
        }
      })

      totalBet = aggregations._sum.betAmount || 0
      totalPayout = aggregations._sum.payout || 0
      totalProfit = aggregations._sum.profit || 0
      avgMultiplier = aggregations._avg.multiplier || 0
    } catch (e) {
      console.error('Aggregations error:', e)
    }

    const winRate = totalGames > 0 ? (winGames / totalGames) * 100 : 0
    const rtp = totalBet > 0 ? (totalPayout / totalBet) * 100 : 0 // 환급률 (Return to Player)

    // 2. 게임별 통계
    let games: any[] = []
    try {
      games = await prisma.gameLog.groupBy({
        by: ['gameType'] as const,
        _count: { _all: true },
        _sum: { betAmount: true, payout: true, profit: true },
        _avg: { multiplier: true }
      } as any)
    } catch (e) {
      console.error('Game stats groupBy error:', e)
      games = []
    }

    const gameStats = await Promise.all(games.map(async (g) => {
      try {
        const wins = await prisma.gameLog.count({
          where: {
            gameType: g.gameType,
            result: { in: ['WIN', 'BLACKJACK', 'JACKPOT'] }
          }
        })

        // 최대 승리 금액 조회
        let maxPayout = 0;
        try {
          const maxPayoutRecord = await prisma.gameLog.findFirst({
            where: {
              gameType: g.gameType,
              payout: { gt: 0 }
            },
            orderBy: {
              payout: 'desc'
            },
            select: {
              payout: true
            }
          })
          maxPayout = maxPayoutRecord?.payout || 0;
        } catch (e) {
          console.error(`Max payout query error for ${g.gameType}:`, e);
        }

        // 평균 베팅 금액 계산
        const avgBetAmount = g._count._all > 0 ? (g._sum.betAmount || 0) / g._count._all : 0

        // 최근 24시간 통계
        let recent24h = 0;
        try {
          recent24h = await prisma.gameLog.count({
            where: {
              gameType: g.gameType,
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          })
        } catch (e) {
          console.error(`Recent 24h query error for ${g.gameType}:`, e);
        }

        return {
          gameType: g.gameType,
          totalGames: g._count._all,
          wins,
          losses: g._count._all - wins,
          winRate: g._count._all > 0 ? (wins / g._count._all) * 100 : 0,
          totalBet: g._sum.betAmount || 0,
          totalPayout: g._sum.payout || 0,
          rtp: (g._sum.betAmount || 0) > 0 ? ((g._sum.payout || 0) / (g._sum.betAmount || 0)) * 100 : 0,
          avgMultiplier: g._avg.multiplier || 0,
          profit: g._sum.profit || 0,
          maxPayout,
          avgBetAmount,
          recent24h
        }
      } catch (e) {
        console.error(`Game stats error for ${g.gameType}:`, e);
        // 오류 발생 시 기본값 반환
        return {
          gameType: g.gameType,
          totalGames: g._count._all || 0,
          wins: 0,
          losses: g._count._all || 0,
          winRate: 0,
          totalBet: g._sum.betAmount || 0,
          totalPayout: g._sum.payout || 0,
          rtp: 0,
          avgMultiplier: 0,
          profit: g._sum.profit || 0,
          maxPayout: 0,
          avgBetAmount: 0,
          recent24h: 0
        }
      }
    }))

    // 3. 날짜별 추이 (최근 7일) - PostgreSQL
    // 주의: Prisma 모델명이 GameLog라면 테이블명도 "GameLog" (대소문자 구분) 일 수 있음
    let serializedDailyStats: any[] = [];
    try {
      const dailyStats: any[] = await prisma.$queryRaw`
        SELECT 
          TO_CHAR("createdAt", 'MM-DD') as date,
          COUNT(*)::int as count,
          SUM(CASE WHEN "result" IN ('WIN', 'BLACKJACK', 'JACKPOT') THEN 1 ELSE 0 END)::int as wins,
          SUM("profit")::int as profit
        FROM "GameLog"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR("createdAt", 'MM-DD')
        ORDER BY date ASC
      `

      // BigInt 처리 (Prisma raw query 결과의 숫자형은 BigInt일 수 있음)
      serializedDailyStats = dailyStats.map(stat => ({
        date: stat.date,
        count: Number(stat.count || 0),
        wins: Number(stat.wins || 0),
        winRate: Number(stat.count || 0) > 0 ? (Number(stat.wins || 0) / Number(stat.count || 0)) * 100 : 0,
        profit: Number(stat.profit || 0)
      }))
    } catch (dailyError) {
      console.error('날짜별 통계 조회 오류:', dailyError)
      // 날짜별 통계 오류는 무시하고 빈 배열 반환
      serializedDailyStats = []
    }

    // 4. 아케이드 게임 랭킹 (각 게임별 Top 3) - 중복 사용자 제거 (각 사용자의 최고 점수만)
    const arcadeGames = ['stairs', 'skyroads', 'windrunner'];
    const rankings: Record<string, any[]> = {};

    for (const type of arcadeGames) {
      try {
        // 각 사용자의 최고 점수만 가져오기
        const topScoresRaw = await prisma.gameScore.findMany({
          where: { gameType: type },
          orderBy: { score: 'desc' },
          take: 50, // 충분히 많이 가져와서 중복 제거
          include: {
            user: {
              select: {
                nickname: true,
                email: true
              }
            }
          }
        });

        // 사용자별 최고 점수만 유지 (중복 제거)
        const uniqueScores = new Map<number, any>();
        for (const score of topScoresRaw) {
          if (!uniqueScores.has(score.userId)) {
            uniqueScores.set(score.userId, score);
          }
        }

        // Top 3만 선택
        const topScores = Array.from(uniqueScores.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        
        rankings[type] = topScores.map(s => ({
          nickname: s.user.nickname || s.user.email.split('@')[0],
          score: s.score,
          date: s.createdAt
        }));
      } catch (e) {
        console.error(`Rankings error for ${type}:`, e)
        rankings[type] = []
      }
    }

    return NextResponse.json({
      summary: {
        totalGames,
        winRate,
        rtp,
        totalProfit,
        avgMultiplier
      },
      byGame: gameStats,
      daily: serializedDailyStats,
      rankings
    })

  } catch (error) {
    console.error('통계 조회 오류:', error)
    // 상세 오류 정보 포함
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack })
    return NextResponse.json({ 
      error: '통계 로드 실패',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 })
  }
}

