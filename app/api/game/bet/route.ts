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
    // game 파라미터를 gameType으로 매핑
    const { action, amount, betAmount, result, multiplier, game, gameType, comboCount } = body
    const betAmountValue = amount || betAmount
    const finalGameType = gameType || game || 'blackjack'

    // action: 'bet' (베팅), 'settle' (정산)
    // amount: 베팅 금액
    // result: 게임 결과 ('win', 'lose', 'draw', 'blackjack')
    // gameType: 'blackjack', 'bustabit', 'cloverpit', 'kuji' 등

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
    let payout = 0
    let isPointsChanged = false; // 포인트 변경 여부 플래그

    if (action === 'bet') {
      // 베팅: 포인트 차감
      if (user.points < betAmountValue) {
        return NextResponse.json(
          { error: '포인트가 부족합니다.' },
          { status: 400 }
        )
      }
      updatedPoints = parseFloat((user.points - betAmountValue).toFixed(2))
      pointsChange = -betAmountValue
      isPointsChanged = true;

      // Kuji는 베팅(구매) 시점에 바로 로그 기록 (결과는 상품이므로 포인트 payout은 0)
      if (finalGameType === 'kuji') {
        try {
          await prisma.gameLog.create({
            data: {
              userId: user.id,
              gameType: 'kuji',
              betAmount: betAmountValue,
              payout: 0,
              profit: -betAmountValue,
              result: 'KUJI_BUY',
              multiplier: 0,
            },
          })
        } catch (logError) {
          console.error('Kuji 로그 저장 실패:', logError)
        }
      }

    } else if (action === 'settle') {
      // 게임 결과에 따른 포인트 지급/차감
      if (result === 'win') {
        // Bustabit: 배율 기반 정산
        if (multiplier && multiplier > 0) {
          // 배율이 있으면 배율 기반으로 정산 (소수점 2자리 처리)
          const totalWinnings = parseFloat((betAmountValue * multiplier).toFixed(2))
          updatedPoints = parseFloat((user.points + totalWinnings).toFixed(2))
          pointsChange = totalWinnings
          payout = totalWinnings
        } else {
          // 일반 승리: 1:1 배당 (베팅 금액 반환 + 승리 금액 = 총 2배)
          updatedPoints = parseFloat((user.points + betAmountValue * 2).toFixed(2))
          pointsChange = betAmountValue * 2
          payout = betAmountValue * 2
        }
        isPointsChanged = true;
      } else if (result === 'blackjack') {
        // 블랙잭 승리: 3:2 배당 (베팅 금액 반환 + 1.5배 승리 금액 = 총 2.5배)
        const totalWinnings = parseFloat((betAmountValue + betAmountValue * 1.5).toFixed(2))
        updatedPoints = parseFloat((user.points + totalWinnings).toFixed(2))
        pointsChange = totalWinnings
        payout = totalWinnings
        isPointsChanged = true;
      } else if (result === 'draw') {
        // 무승부(Push): 베팅 금액 반환
        updatedPoints = parseFloat((user.points + betAmountValue).toFixed(2))
        pointsChange = betAmountValue
        payout = betAmountValue
        isPointsChanged = true;
      } else if (result === 'lose') {
        // 패배: 이미 베팅 시 차감되었으므로 추가 차감 없음
        pointsChange = 0
        payout = 0
        // updatedPoints 변경 없음
        isPointsChanged = false; 
      }

      // 게임 로그 저장 (settle일 때만)
      try {
        await prisma.gameLog.create({
          data: {
            userId: user.id,
            gameType: finalGameType,
            betAmount: betAmountValue,
            payout: payout,
            profit: payout - betAmountValue,
            result: result ? result.toUpperCase() : 'UNKNOWN',
            multiplier: multiplier || (payout > 0 && betAmountValue > 0 ? payout / betAmountValue : 0),
          },
        })

        // 전광판 이벤트 처리
        let billboardMessage = ''
        const nickname = user.nickname || user.email.split('@')[0]

        // 1. 블랙잭 승리
        if (finalGameType === 'blackjack' && result === 'blackjack') {
            billboardMessage = `[BLACKJACK] ${nickname}님이 블랙잭으로 승리하여 ${payout.toLocaleString()}P 획득!`
        }
        // 2. 그래프 10배 이상
        else if (finalGameType === 'bustabit' && multiplier >= 10) {
            billboardMessage = `[BUSTABIT] ${nickname}님이 ${multiplier.toFixed(2)}배로 ${payout.toLocaleString()}P 잭팟!`
        }
        // 3. 룰렛 단일 숫자 적중 (배당률 30배 이상)
        else if (finalGameType === 'roulette' && (payout / (betAmountValue || 1)) >= 30) {
            billboardMessage = `[ROULETTE] ${nickname}님이 숫자를 정확히 맞추어 ${payout.toLocaleString()}P 대박!`
        }
        // 4. 슬롯머신 4콤보 이상 (클라이언트가 combos를 보냄)
        else if (finalGameType === 'cloverpit' && result === 'win' && comboCount >= 4) {
             billboardMessage = `[CLOVERPIT] ${nickname}님이 슬롯머신 ${comboCount}콤보 잭팟으로 ${payout.toLocaleString()}P 획득!`
        }

        if (billboardMessage) {
            await prisma.billboardEvent.create({
                data: {
                    userId: user.id,
                    gameType: finalGameType,
                    message: billboardMessage
                }
            })
        }

      } catch (logError) {
        console.error('로그/전광판 저장 실패:', logError)
      }
    }

    // 포인트가 변경되었을 때만 DB 업데이트 (불필요한 쓰기 및 Race Condition 방지)
    let updatedUser = user;
    
    if (isPointsChanged) {
        // 레벨 재계산
        const updatedLevel = calculateLevel(updatedPoints)
    
        updatedUser = await prisma.user.update({
          where: { id: payload.userId },
          data: {
            points: updatedPoints,
            level: updatedLevel,
          },
        })
    }

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
