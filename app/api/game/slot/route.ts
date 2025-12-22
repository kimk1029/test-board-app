import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'
import {
  generateSlotMatrix,
  calculateSlotPayout,
} from '@/lib/game-servers/slot-server'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAndValidateRequest(request, false)
    
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { error: authResult.error || '인증 실패' },
        { status: authResult.status || 401 }
      )
    }
    
    const payload = authResult.payload
    const body = await request.json()
    const { action } = body
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 스핀 (심볼 조합 생성)
    if (action === 'spin') {
      const { betAmount, multiplier = 1 } = body
      
      if (!betAmount || betAmount < 1 || betAmount > 1000000) {
        return NextResponse.json(
          { error: '베팅 금액이 유효하지 않습니다.' },
          { status: 400 }
        )
      }
      
      if (user.points < betAmount) {
        return NextResponse.json(
          { error: '포인트가 부족합니다.' },
          { status: 400 }
        )
      }
      
      // 포인트 차감
      const updatedPoints = parseFloat((user.points - betAmount).toFixed(2))
      
      // 서버에서 심볼 매트릭스 생성
      const matrix = generateSlotMatrix()
      
      // 지급액 계산
      const { payout, comboCount, isJackpot } = calculateSlotPayout(
        matrix,
        betAmount,
        multiplier
      )
      
      // 포인트 지급
      const finalPoints = parseFloat((updatedPoints + payout).toFixed(2))
      const updatedLevel = calculateLevel(finalPoints)
      
      await prisma.user.update({
        where: { id: payload.userId },
        data: { points: finalPoints, level: updatedLevel }
      })
      
      // 게임 로그 저장
      await prisma.gameLog.create({
        data: {
          userId: payload.userId,
          gameType: 'cloverpit',
          betAmount: betAmount,
          payout: payout,
          profit: payout - betAmount,
          result: payout > 0 ? 'WIN' : 'LOSE',
          multiplier: payout > 0 ? payout / betAmount : 0,
        }
      })
      
      // 전광판 이벤트 (4콤보 이상)
      if (comboCount >= 4) {
        const nickname = user.nickname || user.email.split('@')[0]
        await prisma.billboardEvent.create({
          data: {
            userId: payload.userId,
            gameType: 'cloverpit',
            message: `[CLOVERPIT] ${nickname}님이 슬롯머신 ${comboCount}콤보 잭팟으로 ${payout.toLocaleString()}P 획득!`
          }
        })
      }
      
      return NextResponse.json({
        matrix,
        payout,
        comboCount,
        isJackpot,
        points: finalPoints,
        level: updatedLevel,
        pointsChange: payout - betAmount,
      })
    }
    
    return NextResponse.json(
      { error: '유효하지 않은 액션입니다.' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('슬롯 게임 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

