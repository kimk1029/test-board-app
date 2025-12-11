import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // 1. 실제 전광판 이벤트 조회
    const billboardEvents = await prisma.billboardEvent.findMany({
      where: {
        createdAt: { gte: oneDayAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { nickname: true, email: true } }
      }
    })

    let formattedEvents = billboardEvents.map(event => ({
      id: event.id,
      message: event.message,
      gameType: event.gameType,
      createdAt: event.createdAt,
      user: event.user.nickname || event.user.email.split('@')[0]
    }))

    // 2. 이벤트가 부족하면(5개 미만), 최근 고배당/고수익 게임 로그를 조회하여 채움
    if (formattedEvents.length < 5) {
        const needed = 5 - formattedEvents.length
        
        // 배율 높은 순으로 조회
        const topLogs = await prisma.gameLog.findMany({
            where: {
                createdAt: { gte: oneDayAgo },
                multiplier: { gte: 1.5 }, // 1.5배 이상만
                result: { in: ['WIN', 'JACKPOT', 'BLACKJACK'] } // 승리한 로그만
            },
            orderBy: [
                { multiplier: 'desc' },
                { profit: 'desc' }
            ],
            take: 20, // 넉넉히 가져와서 중복 제거 등 처리
            include: {
                user: { select: { nickname: true, email: true } }
            }
        })

        // 이미 전광판에 있는 유저/게임타입은 제외하거나, 그냥 추가 (여기선 단순 추가)
        for (const log of topLogs) {
            if (formattedEvents.length >= 10) break; // 최대 10개까지만 채움

            const nickname = log.user.nickname || log.user.email.split('@')[0]
            const gameName = log.gameType.toUpperCase()
            const mult = log.multiplier ? log.multiplier.toFixed(2) : '0.00'
            const profit = log.profit.toLocaleString()
            
            // 전광판 이벤트와 겹치지 않게 (ID 음수 사용)
            formattedEvents.push({
                id: -log.id,
                message: `[HOT] ${nickname}님이 ${gameName}에서 ${mult}배(${profit}P) 수익 달성!`,
                gameType: log.gameType,
                createdAt: log.createdAt,
                user: nickname
            })
        }
    }

    // 3. 그래도 데이터가 하나도 없으면 기본 환영 메시지 추가
    if (formattedEvents.length === 0) {
        formattedEvents.push({
            id: 0,
            message: '[SYSTEM] 잭팟의 주인공이 되어보세요! 지금 바로 게임에 도전하세요!',
            gameType: 'SYSTEM',
            createdAt: new Date(),
            user: 'System'
        })
    }

    return NextResponse.json({ events: formattedEvents }, { status: 200 })
  } catch (error) {
    console.error('전광판 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
