import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'
import {
  createServerDeck,
  dealInitialCards,
  hitCard,
  dealerTurn,
  calculateFinalResult,
  isBlackjack,
  isBust,
  calculateScore,
} from '@/lib/game-servers/blackjack-server'
import { Card } from '@/lib/game-servers/blackjack-server'

// 게임 세션 데이터 타입 (타입 체크용)
interface GameSessionData {
  deck: Array<{ suit: string; value: string }>
  playerCards: Array<{ suit: string; value: string; faceUp: boolean }>
  dealerCards: Array<{ suit: string; value: string; faceUp: boolean }>
  deckIndex: number
}
import { Prisma } from '@prisma/client'

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
    
    // 게임 시작 (베팅 + 초기 카드 분배)
    if (action === 'start') {
      const { betAmount } = body
      
      if (!betAmount || betAmount < 1 || betAmount > 1000000) {
        return NextResponse.json(
          { error: '베팅 금액이 유효하지 않습니다. (1 ~ 1,000,000)' },
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
      
      // 서버에서 덱 생성 및 카드 분배
      const deck = createServerDeck()
      const { playerCards, dealerCards, remainingDeck } = dealInitialCards(deck)
      
      // GameSession 생성
      const gameSession = await prisma.gameSession.create({
        data: {
          userId: payload.userId,
          gameType: 'blackjack',
          betAmount: betAmount,
          status: 'pending',
          gameData: {
            deck: remainingDeck.map(c => ({ suit: c.suit, value: c.value })),
            playerCards: playerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
            dealerCards: dealerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
            deckIndex: remainingDeck.length,
          } as Prisma.InputJsonValue,
        }
      })
      
      // 포인트 업데이트
      await prisma.user.update({
        where: { id: payload.userId },
        data: { points: updatedPoints }
      })
      
      return NextResponse.json({
        sessionId: gameSession.id,
        playerCards: playerCards,
        dealerCards: dealerCards,
        points: updatedPoints,
      })
    }
    
    // Hit (카드 한 장 받기)
    if (action === 'hit') {
      const { sessionId } = body
      
      if (!sessionId) {
        return NextResponse.json(
          { error: '게임 세션이 필요합니다.' },
          { status: 400 }
        )
      }
      
      const gameSession = await prisma.gameSession.findUnique({
        where: { id: sessionId }
      })
      
      if (!gameSession || gameSession.userId !== payload.userId) {
        return NextResponse.json(
          { error: '유효하지 않은 게임 세션입니다.' },
          { status: 400 }
        )
      }
      
      if (gameSession.status !== 'pending') {
        return NextResponse.json(
          { error: '이미 종료된 게임입니다.' },
          { status: 400 }
        )
      }
      
      const gameData = gameSession.gameData as any as GameSessionData
      
      // 덱 복원
      const deck: Card[] = gameData.deck.map(c => ({
        suit: c.suit as Card['suit'],
        value: c.value,
        faceUp: false,
      }))
      
      const playerCards: Card[] = gameData.playerCards.map(c => ({
        suit: c.suit as Card['suit'],
        value: c.value,
        faceUp: c.faceUp,
      }))
      
      // Hit 처리
      const { card, remainingDeck } = hitCard(deck)
      playerCards.push(card)
      
      // 버스트 체크
      const bust = isBust(playerCards)
      const result = bust ? 'lose' : 'pending'
      
      // 세션 업데이트
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          gameData: {
            ...gameData,
            deck: remainingDeck.map(c => ({ suit: c.suit, value: c.value })),
            playerCards: playerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
            deckIndex: remainingDeck.length,
          } as Prisma.InputJsonValue,
        }
      })
      
      return NextResponse.json({
        playerCards: playerCards,
        result: result,
        bust: bust,
      })
    }
    
    // Stand (딜러 턴)
    if (action === 'stand') {
      const { sessionId } = body
      
      if (!sessionId) {
        return NextResponse.json(
          { error: '게임 세션이 필요합니다.' },
          { status: 400 }
        )
      }
      
      const gameSession = await prisma.gameSession.findUnique({
        where: { id: sessionId }
      })
      
      if (!gameSession || gameSession.userId !== payload.userId) {
        return NextResponse.json(
          { error: '유효하지 않은 게임 세션입니다.' },
          { status: 400 }
        )
      }
      
      if (gameSession.status !== 'pending') {
        return NextResponse.json(
          { error: '이미 종료된 게임입니다.' },
          { status: 400 }
        )
      }
      
      const gameData = gameSession.gameData as any as GameSessionData
      
      // 덱 복원
      const deck: Card[] = gameData.deck.map(c => ({
        suit: c.suit as Card['suit'],
        value: c.value,
        faceUp: false,
      }))
      
      const playerCards: Card[] = gameData.playerCards.map(c => ({
        suit: c.suit as Card['suit'],
        value: c.value,
        faceUp: c.faceUp,
      }))
      
      const dealerCards: Card[] = gameData.dealerCards.map(c => ({
        suit: c.suit as Card['suit'],
        value: c.value,
        faceUp: c.faceUp,
      }))
      
      // 딜러 턴
      const { dealerCards: finalDealerCards, remainingDeck } = dealerTurn(dealerCards, deck)
      
      // 최종 결과 계산
      const finalResult = calculateFinalResult(
        playerCards,
        finalDealerCards,
        gameSession.betAmount
      )
      
      // 포인트 지급
      const updatedPoints = parseFloat(
        (user.points + finalResult.payout).toFixed(2)
      )
      
      const updatedLevel = calculateLevel(updatedPoints)
      
      await prisma.user.update({
        where: { id: payload.userId },
        data: { points: updatedPoints, level: updatedLevel }
      })
      
      // 세션 업데이트
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'settled',
          result: finalResult.result,
          payout: finalResult.payout,
          settledAt: new Date(),
          gameData: {
            ...gameData,
            playerCards: playerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
            dealerCards: finalDealerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
          } as Prisma.InputJsonValue,
        }
      })
      
      // 게임 로그 저장
      await prisma.gameLog.create({
        data: {
          userId: payload.userId,
          gameType: 'blackjack',
          betAmount: gameSession.betAmount,
          payout: finalResult.payout,
          profit: finalResult.payout - gameSession.betAmount,
          result: finalResult.result.toUpperCase(),
          multiplier: finalResult.payout > 0 ? finalResult.payout / gameSession.betAmount : 0,
        }
      })
      
      // 전광판 이벤트 (블랙잭 승리 시)
      if (finalResult.result === 'blackjack') {
        const nickname = user.nickname || user.email.split('@')[0]
        await prisma.billboardEvent.create({
          data: {
            userId: payload.userId,
            gameType: 'blackjack',
            message: `[BLACKJACK] ${nickname}님이 블랙잭으로 승리하여 ${finalResult.payout.toLocaleString()}P 획득!`
          }
        })
      }
      
      // 보안: 딜러 카드 정보를 응답에서 제거 (네트워크 응답에서 미리 알 수 없도록)
      // 딜러의 두 번째 카드만 공개된 상태로 보냄 (이미 클라이언트에 있음)
      const initialDealerCards = dealerCards.map((card, index) => ({
        suit: card.suit,
        value: card.value,
        faceUp: index === 0 || index === 1, // 첫 번째와 두 번째 카드만 공개
      }))
      
      return NextResponse.json({
        result: finalResult.result,
        payout: finalResult.payout,
        points: updatedPoints,
        level: updatedLevel,
        pointsChange: finalResult.payout - gameSession.betAmount,
        playerCards: playerCards,
        // 보안: 딜러 카드는 초기 2장만 보냄 (나머지는 클라이언트에서 서버 지시에 따라 받음)
        dealerCards: initialDealerCards,
        dealerFinalScore: calculateScore(finalDealerCards), // 최종 점수만 알려줌
        dealerCardCount: finalDealerCards.length, // 딜러 카드 개수만 알려줌
      })
    }
    
    // Double Down
    if (action === 'double') {
      const { sessionId } = body
      
      if (!sessionId) {
        return NextResponse.json(
          { error: '게임 세션이 필요합니다.' },
          { status: 400 }
        )
      }
      
      const gameSession = await prisma.gameSession.findUnique({
        where: { id: sessionId }
      })
      
      if (!gameSession || gameSession.userId !== payload.userId) {
        return NextResponse.json(
          { error: '유효하지 않은 게임 세션입니다.' },
          { status: 400 }
        )
      }
      
      if (gameSession.status !== 'pending') {
        return NextResponse.json(
          { error: '이미 종료된 게임입니다.' },
          { status: 400 }
        )
      }
      
      const gameData = gameSession.gameData as any as GameSessionData
      
      // 더블다운은 첫 2장만 가능
      if (gameData.playerCards.length !== 2) {
        return NextResponse.json(
          { error: '더블다운은 첫 2장에서만 가능합니다.' },
          { status: 400 }
        )
      }
      
      // 추가 베팅 금액 확인
      if (user.points < gameSession.betAmount) {
        return NextResponse.json(
          { error: '더블 다운을 위한 포인트가 부족합니다.' },
          { status: 400 }
        )
      }
      
      // 덱 복원
      const deck: Card[] = gameData.deck.map(c => ({
        suit: c.suit as Card['suit'],
        value: c.value,
        faceUp: false,
      }))
      
      const playerCards: Card[] = gameData.playerCards.map(c => ({
        suit: c.suit as Card['suit'],
        value: c.value,
        faceUp: c.faceUp,
      }))
      
      const dealerCards: Card[] = gameData.dealerCards.map(c => ({
        suit: c.suit as Card['suit'],
        value: c.value,
        faceUp: c.faceUp,
      }))
      
      // 추가 베팅 차감
      const additionalBet = gameSession.betAmount
      const updatedPoints = parseFloat((user.points - additionalBet).toFixed(2))
      const totalBet = gameSession.betAmount + additionalBet
      
      // 카드 한 장만 받기
      const { card, remainingDeck } = hitCard(deck)
      playerCards.push(card)
      
      // 버스트 체크
      const bust = isBust(playerCards)
      
      if (bust) {
        // 버스트 시 즉시 패배
        await prisma.user.update({
          where: { id: payload.userId },
          data: { points: updatedPoints }
        })
        
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            status: 'settled',
            result: 'lose',
            payout: 0,
            betAmount: totalBet,
            settledAt: new Date(),
          }
        })
        
        await prisma.gameLog.create({
          data: {
            userId: payload.userId,
            gameType: 'blackjack',
            betAmount: totalBet,
            payout: 0,
            profit: -totalBet,
            result: 'LOSE',
            multiplier: 0,
          }
        })
        
        return NextResponse.json({
          result: 'lose',
          payout: 0,
          points: updatedPoints,
          pointsChange: -totalBet,
          playerCards: playerCards,
          bust: true,
        })
      }
      
      // 딜러 턴
      const { dealerCards: finalDealerCards, remainingDeck: finalDeck } = dealerTurn(dealerCards, remainingDeck)
      
      // 최종 결과 계산
      const finalResult = calculateFinalResult(
        playerCards,
        finalDealerCards,
        totalBet
      )
      
      // 포인트 지급
      const finalPoints = parseFloat(
        (updatedPoints + finalResult.payout).toFixed(2)
      )
      
      const updatedLevel = calculateLevel(finalPoints)
      
      await prisma.user.update({
        where: { id: payload.userId },
        data: { points: finalPoints, level: updatedLevel }
      })
      
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'settled',
          result: finalResult.result,
          payout: finalResult.payout,
          betAmount: totalBet,
          settledAt: new Date(),
          gameData: {
            ...gameData,
            playerCards: playerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
            dealerCards: finalDealerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
          } as Prisma.InputJsonValue,
        }
      })
      
      await prisma.gameLog.create({
        data: {
          userId: payload.userId,
          gameType: 'blackjack',
          betAmount: totalBet,
          payout: finalResult.payout,
          profit: finalResult.payout - totalBet,
          result: finalResult.result.toUpperCase(),
          multiplier: finalResult.payout > 0 ? finalResult.payout / totalBet : 0,
        }
      })
      
      if (finalResult.result === 'blackjack') {
        const nickname = user.nickname || user.email.split('@')[0]
        await prisma.billboardEvent.create({
          data: {
            userId: payload.userId,
            gameType: 'blackjack',
            message: `[BLACKJACK] ${nickname}님이 블랙잭으로 승리하여 ${finalResult.payout.toLocaleString()}P 획득!`
          }
        })
      }
      
      return NextResponse.json({
        result: finalResult.result,
        payout: finalResult.payout,
        points: finalPoints,
        level: updatedLevel,
        pointsChange: finalResult.payout - totalBet,
        playerCards: playerCards,
        dealerCards: finalDealerCards,
      })
    }
    
    return NextResponse.json(
      { error: '유효하지 않은 액션입니다.' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('블랙잭 게임 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

