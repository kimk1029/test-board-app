import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic' // 캐싱 방지

export async function GET() {
  try {
    // 1. 전체 요약
    const totalGames = await prisma.gameLog.count()
    
    const winGames = await prisma.gameLog.count({
      where: {
        result: { in: ['WIN', 'BLACKJACK', 'JACKPOT'] }
      }
    })

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

    const totalBet = aggregations._sum.betAmount || 0
    const totalPayout = aggregations._sum.payout || 0
    const totalProfit = aggregations._sum.profit || 0
    const winRate = totalGames > 0 ? (winGames / totalGames) * 100 : 0
    const rtp = totalBet > 0 ? (totalPayout / totalBet) * 100 : 0 // 환급률 (Return to Player)

    // 2. 게임별 통계
    const games = await prisma.gameLog.groupBy({
      by: ['gameType'],
      _count: { _all: true },
      _sum: { betAmount: true, payout: true, profit: true },
      _avg: { multiplier: true }
    })

    const gameStats = await Promise.all(games.map(async (g) => {
      const wins = await prisma.gameLog.count({
        where: {
          gameType: g.gameType,
          result: { in: ['WIN', 'BLACKJACK', 'JACKPOT'] }
        }
      })
      return {
        gameType: g.gameType,
        totalGames: g._count._all,
        wins,
        winRate: (wins / g._count._all) * 100,
        totalBet: g._sum.betAmount || 0,
        totalPayout: g._sum.payout || 0,
        rtp: (g._sum.betAmount || 0) > 0 ? ((g._sum.payout || 0) / (g._sum.betAmount || 0)) * 100 : 0,
        avgMultiplier: g._avg.multiplier || 0,
        profit: g._sum.profit || 0
      }
    }))

    // 3. 날짜별 추이 (최근 7일) - PostgreSQL
    // 주의: Prisma 모델명이 GameLog라면 테이블명도 "GameLog" (대소문자 구분) 일 수 있음
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
    const serializedDailyStats = dailyStats.map(stat => ({
      date: stat.date,
      count: Number(stat.count),
      wins: Number(stat.wins),
      winRate: Number(stat.count) > 0 ? (Number(stat.wins) / Number(stat.count)) * 100 : 0,
      profit: Number(stat.profit)
    }))

    // 4. 아케이드 게임 랭킹 (각 게임별 Top 3)
    const arcadeGames = ['stairs', 'skyroads', 'windrunner'];
    const rankings: Record<string, any[]> = {};

    for (const type of arcadeGames) {
      const topScores = await prisma.gameScore.findMany({
        where: { gameType: type },
        orderBy: { score: 'desc' },
        take: 3,
        include: {
          user: {
            select: {
              nickname: true,
              email: true
            }
          }
        }
      });
      
      rankings[type] = topScores.map(s => ({
        nickname: s.user.nickname || s.user.email.split('@')[0],
        score: s.score,
        date: s.createdAt
      }));
    }

    return NextResponse.json({
      summary: {
        totalGames,
        winRate,
        rtp,
        totalProfit,
        avgMultiplier: aggregations._avg.multiplier || 0
      },
      byGame: gameStats,
      daily: serializedDailyStats,
      rankings
    })

  } catch (error) {
    console.error('통계 조회 오류:', error)
    return NextResponse.json({ error: '통계 로드 실패' }, { status: 500 })
  }
}

