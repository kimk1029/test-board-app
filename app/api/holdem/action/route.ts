import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { handlePlayerAction, RoomWithPlayers } from '@/lib/holdem/game-logic'
import { 
  checkHoldemActionRateLimit, 
  validateHoldemAction 
} from '@/lib/holdem-validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 통합 인증 및 요청 검증 (IP/User-Agent 바인딩)
    const authResult = await authenticateAndValidateRequest(request, false);
    
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { error: authResult.error || '인증 실패' }, 
        { status: authResult.status || 401 }
      );
    }

    const payload = authResult.payload;

    // Rate limiting 체크
    const rateLimitCheck = checkHoldemActionRateLimit(payload.userId)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error || '너무 빠른 요청입니다.' },
        { status: 429 }
      )
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

      // 액션 검증
      const validation = validateHoldemAction(
        room as RoomWithPlayers,
        payload.userId,
        action,
        amount || 0
      )

      if (!validation.valid) {
        throw new Error(validation.error || '액션이 유효하지 않습니다.');
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
