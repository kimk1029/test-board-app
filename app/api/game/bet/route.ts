import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { calculateLevel } from '@/lib/points'

// 게임 베팅 처리
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

    const body = await request.json()
    const { action, amount, betAmount, result, multiplier } = body
    const betAmountValue = amount || betAmount // amount 또는 betAmount 둘 다 지원

    // action: 'bet' (베팅), 'win' (승리), 'lose' (패배), 'draw' (무승부)
    // amount: 베팅 금액
    // result: 게임 결과 ('win', 'lose', 'draw', 'blackjack')

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    let updatedPoints = user.points
    let pointsChange = 0

    if (action === 'bet') {
      // 베팅: 포인트 차감
      if (user.points < betAmountValue) {
        return NextResponse.json(
          { error: '포인트가 부족합니다.' },
          { status: 400 }
        )
      }
      updatedPoints = user.points - betAmountValue
      pointsChange = -betAmountValue
    } else if (action === 'settle') {
      // 게임 결과에 따른 포인트 지급/차감
      if (result === 'win') {
        // Bustabit: 배율 기반 정산
        if (multiplier && multiplier > 0) {
          // 배율이 있으면 배율 기반으로 정산
          // 예: 베팅 10, 배율 2.5x → 총 25 반환 (순이익 +15)
          const totalWinnings = Math.floor(betAmountValue * multiplier)
          updatedPoints = user.points + totalWinnings
          pointsChange = totalWinnings
        } else {
          // 일반 승리: 1:1 배당 (베팅 금액 반환 + 승리 금액 = 총 2배)
          // 예: 베팅 1 → 총 2 반환 (순이익 +1)
          updatedPoints = user.points + betAmountValue * 2
          pointsChange = betAmountValue * 2
        }
      } else if (result === 'blackjack') {
        // 블랙잭 승리: 3:2 배당 (베팅 금액 반환 + 1.5배 승리 금액 = 총 2.5배)
        // 예: 베팅 10 → 총 25 반환 (순이익 +15)
        const totalWinnings = betAmountValue + Math.floor(betAmountValue * 1.5)
        updatedPoints = user.points + totalWinnings
        pointsChange = totalWinnings
      } else if (result === 'draw') {
        // 무승부(Push): 베팅 금액 반환
        updatedPoints = user.points + betAmountValue
        pointsChange = betAmountValue
      } else if (result === 'lose') {
        // 패배: 이미 베팅 시 차감되었으므로 추가 차감 없음
        pointsChange = 0
      }
    }

    // 레벨 재계산
    const updatedLevel = calculateLevel(updatedPoints)

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        points: updatedPoints,
        level: updatedLevel,
      },
    })

    return NextResponse.json(
      {
        points: updatedUser.points,
        level: updatedUser.level,
        pointsChange,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('게임 베팅 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

