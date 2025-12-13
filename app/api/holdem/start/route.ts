import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { startGame, RoomWithPlayers } from '@/lib/holdem/game-logic'

export const dynamic = 'force-dynamic'

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
    const { roomId } = body

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      const room = await tx.holdemRoom.findUnique({
        where: { id: roomId },
        include: { players: true }
      })

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.status !== 'waiting') {
        throw new Error('Game is not in waiting state');
      }
      
      if (room.players.length < 2) {
        throw new Error('Need at least 2 players to start');
      }

      // 게임 시작 로직 실행
      const { roomUpdates, playerUpdates } = startGame(room as RoomWithPlayers);

      // DB 업데이트
      await tx.holdemRoom.update({
        where: { id: roomId },
        data: roomUpdates
      });

      for (const update of playerUpdates) {
        await tx.holdemPlayer.update({
          where: {
            roomId_userId: {
              roomId,
              userId: update.userId
            }
          },
          data: update.data
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('게임 시작 오류:', error)
    return NextResponse.json({ error: error.message || 'Failed to start game' }, { status: 500 })
  }
}
