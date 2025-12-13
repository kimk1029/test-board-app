import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { handlePlayerAction, RoomWithPlayers } from '@/lib/holdem/game-logic'

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
    const { roomId, action, amount } = body

    if (!roomId || !action) {
      return NextResponse.json({ error: 'roomId and action are required' }, { status: 400 })
    }

    // 트랜잭션으로 처리
    await prisma.$transaction(async (tx) => {
      // 방과 플레이어 정보 가져오기 (락을 걸면 좋겠지만 Prisma는 기본적으로 지원 안 함, 로직으로 커버)
      const room = await tx.holdemRoom.findUnique({
        where: { id: roomId },
        include: { players: true }
      })

      if (!room) {
        throw new Error('Room not found');
      }

      // 게임 로직 실행
      const { roomUpdates, playerUpdates } = handlePlayerAction(room as RoomWithPlayers, payload.userId, action, amount);

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
    console.error('게임 액션 오류:', error)
    return NextResponse.json({ error: error.message || 'Failed to process action' }, { status: 500 })
  }
}
