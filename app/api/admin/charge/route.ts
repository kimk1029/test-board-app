import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { calculateLevel } from '@/lib/points'

// 테스트 계정 포인트 충전 (test.com 도메인만)
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // test.com 도메인 체크
    const emailDomain = user.email.split('@')[1]
    if (emailDomain !== 'test.com') {
      return NextResponse.json(
        { error: '테스트 계정만 사용할 수 있는 기능입니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { amount } = body
    const chargeAmount = amount || 100 // 기본값 100

    // 포인트 충전
    const updatedPoints = user.points + chargeAmount
    const updatedLevel = calculateLevel(updatedPoints)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        points: updatedPoints,
        level: updatedLevel,
      },
    })

    return NextResponse.json(
      {
        points: updatedUser.points,
        level: updatedUser.level,
        pointsChange: chargeAmount,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('포인트 충전 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

