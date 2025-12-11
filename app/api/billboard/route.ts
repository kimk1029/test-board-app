import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 최근 24시간 내의 이벤트 20개 조회
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const events = await prisma.billboardEvent.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      include: {
        user: {
          select: {
            nickname: true,
            email: true
          }
        }
      }
    })

    const formattedEvents = events.map(event => ({
      id: event.id,
      message: event.message,
      gameType: event.gameType,
      createdAt: event.createdAt,
      user: event.user.nickname || event.user.email.split('@')[0]
    }))

    return NextResponse.json({ events: formattedEvents }, { status: 200 })
  } catch (error) {
    console.error('전광판 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
