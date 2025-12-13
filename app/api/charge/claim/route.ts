import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { calculateLevel } from '@/lib/points'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const { missionId } = await request.json()

    if (!missionId) {
      return NextResponse.json({ error: '미션 ID가 필요합니다.' }, { status: 400 })
    }

    // 트랜잭션 사용
    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: payload.userId },
            include: {
                _count: {
                    select: { posts: true, comments: true }
                }
            }
        })

        if (!user) {
            throw new Error('USER_NOT_FOUND')
        }

        const rewards = (user.missionRewards as string[]) || []

        if (rewards.includes(missionId)) {
            throw new Error('ALREADY_CLAIMED')
        }

        let rewardAmount = 0
        let isCompleted = false

        if (missionId === 'post_10') {
            if (user._count.posts >= 10) {
                rewardAmount = 500 // 게시글 10개 보상
                isCompleted = true
            }
        } else if (missionId === 'comment_50') {
            if (user._count.comments >= 50) {
                rewardAmount = 300 // 댓글 50개 보상
                isCompleted = true
            }
        } else {
            throw new Error('INVALID_MISSION_ID')
        }

        if (!isCompleted) {
            throw new Error('NOT_COMPLETED')
        }

        // 보상 지급 및 상태 업데이트
        const updatedRewards = [...rewards, missionId]
        const updatedPoints = user.points + rewardAmount
        const updatedLevel = calculateLevel(updatedPoints)

        const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: {
                points: updatedPoints,
                level: updatedLevel,
                missionRewards: updatedRewards
            }
        })

        return { success: true, points: updatedUser.points, rewardAmount }
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('미션 보상 수령 오류:', error)
    if (error.message === 'USER_NOT_FOUND') return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    if (error.message === 'ALREADY_CLAIMED') return NextResponse.json({ error: '이미 보상을 수령했습니다.' }, { status: 400 })
    if (error.message === 'INVALID_MISSION_ID') return NextResponse.json({ error: '잘못된 미션 ID입니다.' }, { status: 400 })
    if (error.message === 'NOT_COMPLETED') return NextResponse.json({ error: '미션 조건을 달성하지 못했습니다.' }, { status: 400 })
    
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

