import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { prizes } = await req.json()
    // prizes: { [rank: string]: number }  e.g. { 'A': 2, 'B': 3 ... }

    // 1. 기존 활성 박스 비활성화
    await prisma.kujiBox.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // 2. 새 박스 티켓 생성
    const tickets: Array<{ ticketId: number; rank: string }> = []
    let ticketId = 0
    const ranks = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

    ranks.forEach((rank) => {
      const qty = prizes[rank] || 0
      for (let i = 0; i < qty; i++) {
        tickets.push({
          ticketId: ticketId++,
          rank: rank,
        })
      }
    })

    // 3. 셔플 (Fisher-Yates)
    for (let i = tickets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[tickets[i], tickets[j]] = [tickets[j], tickets[i]]
    }

    // 4. ID 재정렬 (셔플 후 위치 고정)
    const shuffledTickets = tickets.map((t, idx) => ({
      ...t,
      ticketId: idx,
    }))

    // 5. 박스 생성
    const box = await prisma.kujiBox.create({
      data: {
        isActive: true,
        tickets: {
          create: shuffledTickets,
        },
      },
    })

    return NextResponse.json({ success: true, boxId: box.id })
  } catch (error) {
    console.error('Kuji reset error:', error)
    return NextResponse.json({ error: '초기화 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
