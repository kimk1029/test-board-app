import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 게임별 순수익 랭킹 (Profit Ranking)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!gameType) {
        return NextResponse.json({ error: 'gameType is required' }, { status: 400 })
    }

    // Prisma GroupBy로 사용자별 수익 합계 계산
    const profitStats = await prisma.gameLog.groupBy({
        by: ['userId'],
        where: {
            gameType: gameType
        },
        _sum: {
            profit: true
        },
        orderBy: {
            _sum: {
                profit: 'desc'
            }
        },
        take: limit,
    })

    // 사용자 정보 매핑
    const userIds = profitStats.map(stat => stat.userId)
    const users = await prisma.user.findMany({
        where: {
            id: { in: userIds }
        },
        select: {
            id: true,
            nickname: true,
            email: true,
            level: true
        }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const rankings = profitStats.map((stat, index) => {
        const user = userMap.get(stat.userId)
        return {
            rank: index + 1,
            name: user ? (user.nickname || user.email.split('@')[0]) : 'Unknown',
            points: Math.floor(stat._sum.profit || 0), // 순수익
            detail: `Net Profit`
        }
    })

    return NextResponse.json({ rankings })

  } catch (error) {
    console.error('게임 랭킹 조회 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch game rankings' }, { status: 500 })
  }
}
