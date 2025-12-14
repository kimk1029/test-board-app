import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 현재 활성 쿠지 박스 상태 가져오기
export async function GET() {
  try {
    // [FIX] 활성 박스가 여러 개인 경우를 처리: 모든 활성 박스를 확인하고 최신 것만 남김
    const activeBoxes = await prisma.kujiBox.findMany({
      where: { isActive: true },
      orderBy: { id: 'desc' },
      include: {
        tickets: {
          orderBy: { ticketId: 'asc' },
        },
      },
    })

    let activeBox: any = null

    // 활성 박스가 여러 개인 경우, 최신 것만 남기고 나머지는 비활성화
    if (activeBoxes.length > 1) {
      const latestBox = activeBoxes[0]
      const olderBoxes = activeBoxes.slice(1)
      
      // 오래된 박스들 비활성화
      if (olderBoxes.length > 0) {
        await prisma.kujiBox.updateMany({
          where: {
            id: { in: olderBoxes.map(b => b.id) },
          },
          data: { isActive: false },
        })
        console.log(`[Kuji Box] ${olderBoxes.length}개의 중복 활성 박스를 비활성화했습니다. 최신 박스 ID: ${latestBox.id}`)
      }
      
      activeBox = latestBox
    } else if (activeBoxes.length === 1) {
      activeBox = activeBoxes[0]
    } else {
      activeBox = null
    }

    // 활성 박스가 없거나 모든 티켓이 소진되었으면 새 박스 생성
    if (!activeBox) {
      activeBox = await createNewBox()
    } else {
      const remainingCount = activeBox.tickets.filter((t) => !t.isTaken).length
      if (remainingCount === 0) {
        // 이전 박스 비활성화
        await prisma.kujiBox.update({
          where: { id: activeBox.id },
          data: { isActive: false },
        })
        // 새 박스 생성
        activeBox = await createNewBox()
      }
    }

    return NextResponse.json({
      boxId: activeBox.id,
      tickets: activeBox.tickets.map((t) => ({
        id: t.ticketId,
        rank: t.rank,
        isTaken: t.isTaken,
        takenBy: t.takenBy,
      })),
      prizeInfo: activeBox.prizeInfo, // [NEW] 메타데이터 포함
    })
  } catch (error) {
    console.error('Kuji box fetch error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 새 쿠지 박스 생성
async function createNewBox() {
  const PRIZE_LIST = [
    { rank: 'A', totalQty: 2 },
    { rank: 'B', totalQty: 3 },
    { rank: 'C', totalQty: 5 },
    { rank: 'D', totalQty: 10 },
    { rank: 'E', totalQty: 15 },
    { rank: 'F', totalQty: 20 },
    { rank: 'G', totalQty: 25 },
  ]

  // 티켓 배열 생성
  const tickets: Array<{ ticketId: number; rank: string }> = []
  let ticketId = 0

  PRIZE_LIST.forEach((prize) => {
    for (let i = 0; i < prize.totalQty; i++) {
      tickets.push({
        ticketId: ticketId++,
        rank: prize.rank,
      })
    }
  })

  // 셔플 (Fisher-Yates)
  for (let i = tickets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tickets[i], tickets[j]] = [tickets[j], tickets[i]]
  }

  // ID 재정렬 (셔플 후 위치 고정)
  const shuffledTickets = tickets.map((t, idx) => ({
    ...t,
    ticketId: idx,
  }))

  // 박스 생성
  const box = await prisma.kujiBox.create({
    data: {
      isActive: true,
      tickets: {
        create: shuffledTickets,
      },
    },
    include: {
      tickets: {
        orderBy: { ticketId: 'asc' },
      },
    },
  })

  return box
}

