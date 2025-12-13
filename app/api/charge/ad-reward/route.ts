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

    // 광고 보상량 설정 (예: 50 포인트)
    const REWARD_AMOUNT = 50

    // 트랜잭션 처리
    const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: payload.userId }
        })

        if (!user) throw new Error('USER_NOT_FOUND')

        const updatedPoints = user.points + REWARD_AMOUNT
        const updatedLevel = calculateLevel(updatedPoints)

        return await tx.user.update({
            where: { id: user.id },
            data: {
                points: updatedPoints,
                level: updatedLevel
            }
        })
    })

    return NextResponse.json({
        success: true,
        points: updatedUser.points,
        rewardAmount: REWARD_AMOUNT,
        message: '광고 시청 보상이 지급되었습니다.'
    })

  } catch (error: any) {
    console.error('광고 보상 지급 오류:', error)
    if (error.message === 'USER_NOT_FOUND') {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

