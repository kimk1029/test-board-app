import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 종합 활동량 랭킹 (Total Activity)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // 활동량 점수 계산 로직
    // 1. 레벨 * 1000
    // 2. 보유 포인트 * 0.01
    // 3. 게시글 수 * 50
    // 4. 댓글 수 * 10
    // 5. 게임 플레이 수(Log) * 5 (이건 별도 쿼리 필요하지만 일단 단순화하여 Level/Points/Posts 위주로)
    
    // Prisma로 데이터 가져오기 (게임 로그 카운트까지 하면 너무 무거우므로 기본 정보만)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        email: true,
        level: true,
        points: true,
        _count: {
            select: {
                posts: true,
                comments: true
            }
        }
      },
      orderBy: {
        points: 'desc' // 1차 필터링용 (데이터 많으면 성능 이슈)
      },
      take: 100 // 상위 100명 가져와서 정밀 계산
    })

    // 활동 점수 계산 및 정렬
    const rankedUsers = users.map(user => {
        // 점수 공식: (Level * 1000) + (Posts * 50) + (Comments * 10) + (Points * 0.001)
        const activityScore = (user.level * 1000) + (user._count.posts * 50) + (user._count.comments * 10) + (user.points * 0.001)
        
        return {
            ...user,
            activityScore
        }
    }).sort((a, b) => b.activityScore - a.activityScore) // 내림차순 정렬

    const topUsers = rankedUsers.slice(0, limit).map((user, index) => ({
        rank: index + 1,
        name: user.nickname || user.email.split('@')[0],
        level: user.level,
        points: Math.floor(user.points), // 소수점 제거
        score: Math.floor(user.activityScore)
    }))

    return NextResponse.json({ rankings: topUsers })

  } catch (error) {
    console.error('활동 랭킹 조회 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch activity rankings' }, { status: 500 })
  }
}

