import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { startGame, RoomWithPlayers } from '@/lib/holdem/game-logic'

export const dynamic = 'force-dynamic'

// 방 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    const room = await prisma.holdemRoom.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                email: true
              }
            }
          },
          orderBy: {
            seatIndex: 'asc'
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // 게임 상태 파싱
    const gameState = room.gameState as any || {}
    const communityCards = room.communityCards as any || []

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        maxPlayers: room.maxPlayers,
        smallBlind: room.smallBlind,
        bigBlind: room.bigBlind,
        status: room.status,
        currentRound: room.currentRound,
        pot: room.pot,
        dealerIndex: room.dealerIndex,
        communityCards,
        gameState
      },
      players: room.players.map(p => ({
        id: p.id,
        userId: p.userId,
        seatIndex: p.seatIndex,
        nickname: p.user.nickname || p.user.email.split('@')[0],
        holeCards: p.holeCards,
        chips: p.chips,
        currentBet: p.currentBet,
        isActive: p.isActive,
        isAllIn: p.isAllIn,
        position: p.position
      }))
    })

  } catch (error) {
    console.error('방 정보 조회 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}

// 플레이어 앉기
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
    const { roomId, seatIndex, buyIn = 1000 } = body

    if (!roomId || seatIndex === undefined) {
      return NextResponse.json({ error: 'roomId and seatIndex are required' }, { status: 400 })
    }

    // 방 확인
    const room = await prisma.holdemRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // 이미 참가했는지 확인
    const existingPlayer = room.players.find(p => p.userId === payload.userId)
    if (existingPlayer) {
      return NextResponse.json({ error: '이미 참가 중입니다.' }, { status: 400 })
    }

    // 좌석이 비어있는지 확인
    const seatTaken = room.players.find(p => p.seatIndex === seatIndex)
    if (seatTaken) {
      return NextResponse.json({ error: '이미 차지된 좌석입니다.' }, { status: 400 })
    }

    // 사용자 포인트 확인
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || user.points < buyIn) {
      return NextResponse.json({ error: '포인트가 부족합니다.' }, { status: 400 })
    }

    // 트랜잭션: 플레이어 추가 + 포인트 차감
    await prisma.$transaction(async (tx) => {
      // 플레이어 추가
      const newPlayer = await tx.holdemPlayer.create({
        data: {
          roomId,
          userId: payload.userId,
          seatIndex,
          chips: buyIn,
          isActive: true
        }
      })

      // 포인트 차감
      await tx.user.update({
        where: { id: payload.userId },
        data: {
          points: user.points - buyIn
        }
      })
      
      // 최신 방 정보 다시 가져오기 (플레이어 추가 후)
      const updatedRoom = await tx.holdemRoom.findUnique({
        where: { id: roomId },
        include: { players: true }
      });

      // 자동 게임 시작 로직 제거됨
    })

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('플레이어 앉기 오류:', error)
    return NextResponse.json({ error: 'Failed to join seat' }, { status: 500 })
  }
}

// 플레이어 나가기
export async function DELETE(request: NextRequest) {
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

    // 트랜잭션: 플레이어 제거 및 포인트 환불(선택사항, 일단은 칩 증발 or 저장. 여기선 그냥 나감 처리만)
    // 실제로는 남은 칩을 포인트로 돌려줘야 함
    await prisma.$transaction(async (tx) => {
      const player = await tx.holdemPlayer.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: payload.userId
          }
        }
      })

      if (!player) {
        // 이미 없으면 성공 처리
        return
      }

      // 포인트 환불 (남은 칩만큼)
      if (player.chips > 0) {
        await tx.user.update({
          where: { id: payload.userId },
          data: {
            points: {
              increment: player.chips
            }
          }
        })
      }

      // 플레이어 삭제
      await tx.holdemPlayer.delete({
        where: {
          roomId_userId: {
            roomId,
            userId: payload.userId
          }
        }
      })
      
      // 방에 아무도 없으면 방 삭제? (선택사항, 다른 API에서 처리중이면 생략)
      /*
      const remainingPlayers = await tx.holdemPlayer.count({ where: { roomId } });
      if (remainingPlayers === 0) {
           await tx.holdemRoom.delete({ where: { id: roomId } });
      }
      */
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('플레이어 나가기 오류:', error)
    return NextResponse.json({ error: 'Failed to leave room' }, { status: 500 })
  }
}
