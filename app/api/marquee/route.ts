import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const events = await prisma.billboardEvent.findMany({
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
      nickname: event.user.nickname || event.user.email.split('@')[0],
      createdAt: event.createdAt
    }))

    return NextResponse.json({ events: formattedEvents }, { status: 200 })
  } catch (error) {
    console.error('Marquee fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

