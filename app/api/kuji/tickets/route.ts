import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// 티켓 선택 및 업데이트
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
    const { boxId, ticketIds } = body

    console.log(`[Kuji Tickets] Received request: boxId=${boxId}, ticketIds=${JSON.stringify(ticketIds)}, userId=${payload.userId}`)

    if (!boxId || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      console.error(`[Kuji Tickets] Invalid request: boxId=${boxId}, ticketIds=${JSON.stringify(ticketIds)}`)
      return NextResponse.json(
        { error: '잘못된 요청입니다.' },
        { status: 400 }
      )
    }

    // 티켓들이 이미 뽑혔는지 확인
    const existingTickets = await prisma.kujiTicket.findMany({
      where: {
        boxId,
        ticketId: { in: ticketIds },
      },
    })

    console.log(`[Kuji Tickets] Found ${existingTickets.length} existing tickets out of ${ticketIds.length} requested`)

    // 요청한 티켓이 모두 존재하는지 확인
    if (existingTickets.length !== ticketIds.length) {
      const foundIds = existingTickets.map(t => t.ticketId)
      const missingIds = ticketIds.filter(id => !foundIds.includes(id))
      console.error(`[Kuji Tickets] Missing tickets: ${JSON.stringify(missingIds)}`)
      return NextResponse.json(
        { error: `일부 티켓을 찾을 수 없습니다. (boxId: ${boxId}, missing: ${JSON.stringify(missingIds)})` },
        { status: 400 }
      )
    }

    // 이미 뽑힌 티켓이 있는지 확인
    const takenTickets = existingTickets.filter((t) => t.isTaken)
    if (takenTickets.length > 0) {
      console.error(`[Kuji Tickets] Already taken tickets: ${JSON.stringify(takenTickets.map(t => t.ticketId))}`)
      return NextResponse.json(
        { error: '이미 뽑힌 티켓이 포함되어 있습니다.' },
        { status: 400 }
      )
    }

    // 트랜잭션으로 티켓 업데이트 (원자성 보장)
    const updateResult = await prisma.$transaction(async (tx) => {
      // 티켓 업데이트 (뽑힌 것으로 표시)
      const result = await tx.kujiTicket.updateMany({
        where: {
          boxId,
          ticketId: { in: ticketIds },
          isTaken: false, // 아직 뽑히지 않은 티켓만 업데이트
        },
        data: {
          isTaken: true,
          takenBy: payload.userId,
          updatedAt: new Date(), // 명시적으로 업데이트 시간 설정
        },
      })

      console.log(`[Kuji Tickets] Updated ${result.count} tickets in transaction`)

      // 업데이트된 티켓 정보 조회
      const updated = await tx.kujiTicket.findMany({
        where: {
          boxId,
          ticketId: { in: ticketIds },
        },
      })

      return { result, updated }
    })

    console.log(`[Kuji Tickets] Transaction completed: Updated ${updateResult.result.count} tickets for box ${boxId} by user ${payload.userId}`)

    const updatedTickets = updateResult.updated

    // 업데이트 확인
    if (updatedTickets.length !== ticketIds.length) {
      console.error(`[Kuji Tickets] Warning: Expected ${ticketIds.length} tickets but got ${updatedTickets.length}`)
    }

    // 모든 티켓이 제대로 업데이트되었는지 확인
    const notUpdated = updatedTickets.filter(t => !t.isTaken || t.takenBy !== payload.userId)
    if (notUpdated.length > 0) {
      console.error(`[Kuji Tickets] Error: ${notUpdated.length} tickets were not properly updated`, notUpdated.map(t => ({
        ticketId: t.ticketId,
        isTaken: t.isTaken,
        takenBy: t.takenBy,
        expectedBy: payload.userId
      })))
      return NextResponse.json(
        { error: '일부 티켓이 제대로 업데이트되지 않았습니다.' },
        { status: 500 }
      )
    }

    console.log(`[Kuji Tickets] Successfully updated all ${updatedTickets.length} tickets`)

    // GameLog 생성 및 전광판 이벤트
    const logs = []
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, nickname: true, email: true }
    })
    const nickname = user?.nickname || user?.email.split('@')[0] || 'Unknown'

    for (const ticket of updatedTickets) {
        logs.push({
            userId: payload.userId,
            gameType: 'kuji',
            betAmount: 0,
            payout: 0,
            profit: 0,
            result: 'WIN',
            metadata: { rank: ticket.rank, ticketId: ticket.ticketId, boxId: ticket.boxId }
        })

        // 전광판 이벤트: A상 또는 라스트원상
        if (ticket.rank === 'A' || ticket.rank === 'LAST_ONE') {
            await prisma.billboardEvent.create({
                data: {
                    userId: payload.userId,
                    gameType: 'kuji',
                    message: `[KUJI] ${nickname}님이 이치방쿠지 ${ticket.rank === 'LAST_ONE' ? '라스트원상' : 'A상'}을 획득하셨습니다! 축하합니다!`
                }
            })
        }
    }

    await prisma.gameLog.createMany({
      data: logs
    })

    return NextResponse.json({
      success: true,
      tickets: updatedTickets.map((t) => ({
        id: t.ticketId,
        rank: t.rank, // 등급 정보 포함
        isTaken: t.isTaken,
        takenBy: t.takenBy,
      })),
    })
  } catch (error) {
    console.error('Kuji ticket update error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
