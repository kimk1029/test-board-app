import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 포인트 랭킹 조회 (상위 N명)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // 포인트가 높은 순으로 정렬하여 상위 사용자 조회
    const rankings = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        points: true,
        level: true,
        createdAt: true,
      },
      orderBy: {
        points: 'desc',
      },
      take: limit,
    })

    // 랭킹 순위 추가
    const rankingsWithPosition = rankings.map((user, index) => ({
      ...user,
      rank: index + 1,
    }))

    return NextResponse.json(
      {
        rankings: rankingsWithPosition,
        total: rankings.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('랭킹 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

