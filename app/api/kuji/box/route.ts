import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 현재 활성 쿠지 박스 상태 가져오기
export async function GET() {
  try {
    // 활성 박스 찾기 또는 생성
    let activeBox = await prisma.kujiBox.findFirst({
      where: { isActive: true },
      include: {
        tickets: {
          orderBy: { ticketId: 'asc' },
        },
      },
    })

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

