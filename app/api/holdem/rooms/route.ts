import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 방 목록 조회
export async function GET() {
  try {
    const rooms = await prisma.holdemRoom.findMany({
      where: {
        status: { in: ['waiting', 'playing'] }
      },
      include: {
        players: {
          select: {
            id: true,
            userId: true,
            seatIndex: true,
            isActive: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50
    })

    const formattedRooms = rooms.map(room => ({
      id: room.id,
      name: room.name,
      maxPlayers: room.maxPlayers,
      smallBlind: room.smallBlind,
      bigBlind: room.bigBlind,
      status: room.status,
      pot: room.pot,
      playerCount: room.players.length,
      createdAt: room.createdAt.toISOString()
    }))

    return NextResponse.json({ rooms: formattedRooms })
  } catch (error) {
    console.error('방 목록 조회 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

// 방 생성
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { name, smallBlind = 10, bigBlind = 20, maxPlayers = 6 } = body

    if (!name) {
      return NextResponse.json({ error: '방 이름이 필요합니다.' }, { status: 400 })
    }

    // 사용자 정보 확인
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 방 생성
    const room = await prisma.holdemRoom.create({
      data: {
        name,
        smallBlind,
        bigBlind,
        maxPlayers,
        status: 'waiting'
      }
    })

    return NextResponse.json({ 
      roomId: room.id,
      message: '방이 생성되었습니다.'
    }, { status: 201 })

  } catch (error) {
    console.error('방 생성 오류:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}

