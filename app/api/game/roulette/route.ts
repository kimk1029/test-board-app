import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'
import {
  generateWinningNumber,
  calculateRoulettePayout,
} from '@/lib/game-servers/roulette-server'

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
    
    // 스핀 (당첨 번호 생성)
    if (action === 'spin') {
      const { bets, totalBet } = body
      
      if (!bets || Object.keys(bets).length === 0) {
        return NextResponse.json(
          { error: '베팅이 필요합니다.' },
          { status: 400 }
        )
      }
      
      if (!totalBet || totalBet < 1 || totalBet > 1000000) {
        return NextResponse.json(
          { error: '베팅 금액이 유효하지 않습니다.' },
          { status: 400 }
        )
      }
      
      if (user.points < totalBet) {
        return NextResponse.json(
          { error: '포인트가 부족합니다.' },
          { status: 400 }
        )
      }
      
      // 포인트 차감
      const updatedPoints = parseFloat((user.points - totalBet).toFixed(2))
      
      // 서버에서 당첨 번호 생성
      const winningNumber = generateWinningNumber()
      
      // 지급액 계산
      const payout = calculateRoulettePayout(winningNumber, bets)
      
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
          gameType: 'roulette',
          betAmount: totalBet,
          payout: payout,
          profit: payout - totalBet,
          result: payout > 0 ? 'WIN' : 'LOSE',
          multiplier: payout > 0 ? payout / totalBet : 0,
        }
      })
      
      // 전광판 이벤트 (단일 숫자 적중 시)
      if (payout / totalBet >= 30) {
        const nickname = user.nickname || user.email.split('@')[0]
        await prisma.billboardEvent.create({
          data: {
            userId: payload.userId,
            gameType: 'roulette',
            message: `[ROULETTE] ${nickname}님이 숫자를 정확히 맞추어 ${payout.toLocaleString()}P 대박!`
          }
        })
      }
      
      return NextResponse.json({
        winningNumber,
        payout,
        points: finalPoints,
        level: updatedLevel,
        pointsChange: payout - totalBet,
      })
    }
    
    return NextResponse.json(
      { error: '유효하지 않은 액션입니다.' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('룰렛 게임 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

