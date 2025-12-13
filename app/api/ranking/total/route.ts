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
    // 2. 보유 포인트 * 0.01 (포인트도 중요하지만 활동량이 더 중요하도록 가중치 조절)
    // 3. 게시글 수 * 50
    // 4. 댓글 수 * 10
    // 5. 총 베팅 금액 (GameLog) * 0.05
    // 6. 게임 플레이 횟수 (GameLog count) * 20

    // Prisma GroupBy로 게임 통계 집계 (베팅액 합계, 플레이 횟수)
    const gameStats = await prisma.gameLog.groupBy({
        by: ['userId'],
        _sum: {
            betAmount: true
        },
        _count: {
            id: true // 플레이 횟수
        }
    })
    
    // 게임 통계를 Map으로 변환하여 빠른 조회
    const gameStatMap = new Map()
    gameStats.forEach(stat => {
        gameStatMap.set(stat.userId, {
            totalBet: stat._sum.betAmount || 0,
            playCount: stat._count.id || 0
        })
    })
    
    // 유저 기본 정보 가져오기
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        email: true,
        level: true,
        points: true,
        lastLoginDate: true, // 접속일도 고려 가능 (최근 접속자 우대 등)
        _count: {
            select: {
                posts: true,
                comments: true
            }
        }
      },
      take: 200 // 상위 200명 대상으로 정밀 계산
    })

    // 활동 점수 계산 및 정렬
    const rankedUsers = users.map(user => {
        const gameStat = gameStatMap.get(user.id) || { totalBet: 0, playCount: 0 }
        
        // 점수 공식
        // 기본 점수: 레벨 비중 높음
        let activityScore = (user.level * 1000) 
        // 커뮤니티 활동
        activityScore += (user._count.posts * 50) + (user._count.comments * 10)
        // 자산 규모 (너무 크지 않게 1%)
        activityScore += (user.points * 0.01)
        // 게임 활동 (베팅 금액 5%, 플레이 횟수당 20점)
        activityScore += (gameStat.totalBet * 0.05) + (gameStat.playCount * 20)
        
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

