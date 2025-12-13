import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // 종료된(비활성화된) 박스 조회 (최신순)
    const boxes = await prisma.kujiBox.findMany({
      where: { isActive: false },
      orderBy: { createdAt: 'desc' },
      take: 20, // 최근 20개만 (필요시 페이지네이션)
      include: {
        tickets: {
          where: { isTaken: true }, // 뽑힌 티켓만 조회
          include: {
            // 당첨자 정보 포함 (User 모델과 관계가 없다면 수동 조인해야 하지만, 스키마에는 없으므로 raw query나 로직 처리)
            // 현재 스키마에는 KujiTicket에 relation이 없으므로 takenBy ID로 유저를 찾아야 함
            // 하지만 효율성을 위해 여기서는 User 정보를 직접 relation으로 가져올 수 없으니
            // 아래 로직에서 처리하거나, Prisma 스키마에 관계가 있다면 include를 씁니다.
            // *현재 스키마 확인 결과: KujiTicket에 takenBy(Int)만 있고 User relation은 없습니다.*
            // 따라서 API 단에서 유저 정보를 매핑해줍니다.
          }
        }
      }
    })

    // 당첨자 ID 목록 추출
    const userIds = new Set<number>()
    boxes.forEach(box => {
      box.tickets.forEach(t => {
        if (t.takenBy) userIds.add(t.takenBy)
      })
    })

    // 유저 정보 조회
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, nickname: true, email: true }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    // 응답 데이터 구성
    const history = boxes.map(box => {
      // 해당 박스의 경품 정보 (JSON)
      const prizeMeta = box.prizeInfo as any[] || []
      
      const winners = box.tickets.map(t => {
        const user = t.takenBy ? userMap.get(t.takenBy) : null
        // 경품 이름 찾기
        const prizeName = prizeMeta.find((p: any) => p.rank === t.rank)?.name || t.rank + '상'
        
        return {
          rank: t.rank,
          prizeName: prizeName,
          user: user ? (user.nickname || user.email.split('@')[0]) : 'Unknown',
          email: user?.email,
          at: t.updatedAt
        }
      })

      // 등급순 정렬 (A, B, C...)
      winners.sort((a, b) => a.rank.localeCompare(b.rank))

      return {
        id: box.id,
        createdAt: box.createdAt,
        updatedAt: box.updatedAt, // 종료 시점 (마지막 업데이트)
        totalSold: box.tickets.length,
        winners: winners
      }
    })

    return NextResponse.json({ history })
  } catch (error) {
    console.error('History fetch error:', error)
    return NextResponse.json({ error: '기록 조회 실패' }, { status: 500 })
  }
}
