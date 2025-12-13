import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { prizes } = await req.json()
    // prizes: Array<{ rank: string, name: string, qty: number, color: string }>

    // 1. 기존 활성 박스 비활성화
    await prisma.kujiBox.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // 2. 새 박스 티켓 생성
    const tickets: Array<{ ticketId: number; rank: string }> = []
    let ticketId = 0
    
    // prizes 배열을 순회하며 티켓 생성 (LAST_ONE 제외)
    prizes.forEach((prize: any) => {
        if (prize.rank === 'LAST_ONE') return; // 라스트원은 티켓으로 만들지 않음 (별도 로직)

        for (let i = 0; i < prize.qty; i++) {
            tickets.push({
                ticketId: ticketId++,
                rank: prize.rank,
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

    // 5. 박스 생성 (prizeInfo 메타데이터 저장)
    const box = await prisma.kujiBox.create({
      data: {
        isActive: true,
        prizeInfo: prizes, // [NEW] 프론트에서 받은 상품 설정 저장
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
