import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { KujiBox, KujiTicket } from '@prisma/client'

// 캐싱 방지: 항상 최신 데이터 조회
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 현재 활성 쿠지 박스 상태 가져오기
export async function GET() {
  try {
    // 프로덕션 환경에서 연결 풀링 문제를 방지하기 위해 명시적으로 연결 확인
    await prisma.$connect().catch(() => {
      // 이미 연결되어 있으면 무시
    })

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

    let activeBox: (KujiBox & { tickets: KujiTicket[] }) | null = null

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
      const remainingCount = activeBox.tickets.filter((t: { isTaken: boolean }) => !t.isTaken).length
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

    // 등급별 남은 수량 계산
    const prizeInfo = activeBox.prizeInfo as any
    const calculatedPrizeInfo = prizeInfo && Array.isArray(prizeInfo) 
      ? prizeInfo.map((prize: any) => {
          // 실제 남은 수량 계산 (isTaken이 false인 티켓 중 해당 rank인 것)
          const remainingQty = activeBox.tickets.filter(
            (t: KujiTicket) => !t.isTaken && t.rank === prize.rank
          ).length
          return {
            ...prize,
            qty: remainingQty, // 실제 남은 수량으로 업데이트
            totalQty: prize.totalQty || prize.qty, // 초기 총 수량 유지
          }
        })
      : prizeInfo || null // prizeInfo가 없으면 null 반환

    // 캐싱 방지 헤더 추가
    const response = NextResponse.json({
      boxId: activeBox.id,
      // 보안: 뽑히지 않은 티켓의 rank는 null로 반환 (네트워크 탭에서 확인 불가)
      tickets: activeBox.tickets.map((t: KujiTicket) => ({
        id: t.ticketId,
        rank: t.isTaken ? t.rank : null, // 뽑힌 티켓만 rank 정보 반환
        isTaken: t.isTaken,
        // takenBy는 보안상 제거 (필요시 클라이언트에서 별도 조회)
      })),
      prizeInfo: calculatedPrizeInfo, // 실제 남은 수량이 계산된 상품 정보
    })

    // 캐싱 방지 헤더 설정
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Kuji box fetch error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 새 쿠지 박스 생성
async function createNewBox(): Promise<KujiBox & { tickets: KujiTicket[] }> {
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

