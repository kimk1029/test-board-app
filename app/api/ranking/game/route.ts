import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!gameType) {
      return NextResponse.json({ error: 'gameType is required' }, { status: 400 })
    }

    // 모든 점수 기록을 점수 내림차순으로 가져옴
    // Prisma의 distinct 기능이나 groupBy를 활용할 수도 있지만,
    // user 정보를 포함(include)하면서 정렬하려면 raw query나 후처리가 필요할 수 있음.
    // 여기서는 findMany 후 메모리에서 중복 제거 방식을 사용 (데이터가 아주 많지 않다고 가정)
    const scores = await prisma.gameScore.findMany({
      where: { gameType },
      orderBy: { score: 'desc' },
      take: 50, // 상위 50개 정도 가져와서 유저별 중복 제거
      include: {
        user: {
          select: {
            nickname: true,
            email: true
          }
        }
      }
    })

    // 유저별 최고 점수만 남기기 (중복 제거)
    const uniqueRankings = []
    const seenUserIds = new Set()

    for (const record of scores) {
      if (seenUserIds.has(record.userId)) continue;
      seenUserIds.add(record.userId);

      uniqueRankings.push({
        rank: uniqueRankings.length + 1,
        name: record.user.nickname || record.user.email.split('@')[0],
        score: record.score
      })

      if (uniqueRankings.length >= limit) break;
    }

    return NextResponse.json({ rankings: uniqueRankings })

  } catch (error) {
    console.error('게임 랭킹 조회 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
  }
}

