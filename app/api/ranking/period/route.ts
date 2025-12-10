import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 일간/주간/월간 포인트 랭킹 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily' // daily, weekly, monthly
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // 기간 계산
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'weekly':
        const dayOfWeek = now.getDay()
        startDate = new Date(now)
        startDate.setDate(now.getDate() - dayOfWeek)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }

    // 해당 기간 동안 포인트를 많이 획득한 사용자 조회
    // 실제로는 포인트 변경 이력을 추적해야 하지만, 
    // 현재는 전체 포인트 기준으로 랭킹을 제공
    // 추후 포인트 히스토리 테이블을 추가하면 정확한 기간별 랭킹 가능

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
        period,
        rankings: rankingsWithPosition,
        total: rankings.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('기간별 랭킹 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

