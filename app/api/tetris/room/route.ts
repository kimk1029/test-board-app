import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'

export const dynamic = 'force-dynamic'

// 방 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    const room = await prisma.tetrisRoom.findUnique({
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
            playerIndex: 'asc'
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const gameState = room.gameState as any || {}

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        mode: room.mode,
        status: room.status,
        gameState,
        winnerId: room.winnerId
      },
      players: room.players.map(p => ({
        id: p.id,
        userId: p.userId,
        playerIndex: p.playerIndex,
        nickname: p.user.nickname || p.user.email.split('@')[0],
        score: p.score,
        lines: p.lines,
        level: p.level,
        isGameOver: p.isGameOver,
        grid: p.grid,
        currentPiece: p.currentPiece,
        nextPiece: p.nextPiece
      }))
    })

  } catch (error) {
    console.error('방 정보 조회 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}

// 방 생성 또는 참가
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAndValidateRequest(request, false)
    
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { error: authResult.error || '인증 실패' },
        { status: authResult.status || 401 }
      )
    }
    
    const payload = authResult.payload
    const body = await request.json()
    const { roomId, mode = 'multiplayer' } = body

    // 기존 방에 참가
    if (roomId) {
      const room = await prisma.tetrisRoom.findUnique({
        where: { id: roomId },
        include: { players: true }
      })

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      if (room.status !== 'waiting') {
        return NextResponse.json({ error: 'Room is not available' }, { status: 400 })
      }

      // 이미 참가했는지 확인
      const existingPlayer = room.players.find(p => p.userId === payload.userId)
      if (existingPlayer) {
        return NextResponse.json({
          success: true,
          roomId: room.id,
          playerIndex: existingPlayer.playerIndex
        })
      }

      // 플레이어 수 확인
      if (room.players.length >= 2) {
        return NextResponse.json({ error: 'Room is full' }, { status: 400 })
      }

      // 플레이어 추가
      const playerIndex = room.players.length
      const newPlayer = await prisma.tetrisPlayer.create({
        data: {
          roomId,
          userId: payload.userId,
          playerIndex
        }
      })

      // 방 상태 업데이트
      let updatedStatus = room.status
      if (room.players.length + 1 >= 2) {
        updatedStatus = 'playing'
      }

      await prisma.tetrisRoom.update({
        where: { id: roomId },
        data: { status: updatedStatus }
      })

      return NextResponse.json({
        success: true,
        roomId: room.id,
        playerIndex: newPlayer.playerIndex
      })
    }

    // 새 방 생성
    const newRoom = await prisma.tetrisRoom.create({
      data: {
        mode,
        status: mode === 'single' ? 'playing' : 'waiting'
      },
      include: {
        players: true
      }
    })

    // 첫 플레이어 추가
    const playerIndex = 0
    await prisma.tetrisPlayer.create({
      data: {
        roomId: newRoom.id,
        userId: payload.userId,
        playerIndex
      }
    })

    return NextResponse.json({
      success: true,
      roomId: newRoom.id,
      playerIndex
    })

  } catch (error) {
    console.error('방 생성/참가 오류:', error)
    return NextResponse.json({ error: 'Failed to create/join room' }, { status: 500 })
  }
}

// 플레이어 나가기
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateAndValidateRequest(request, false)
    
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { error: authResult.error || '인증 실패' },
        { status: authResult.status || 401 }
      )
    }
    
    const payload = authResult.payload
    const body = await request.json()
    const { roomId } = body

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      const player = await tx.tetrisPlayer.findFirst({
        where: {
          roomId,
          userId: payload.userId
        }
      })

      if (!player) {
        return
      }

      // 플레이어 삭제
      await tx.tetrisPlayer.delete({
        where: {
          id: player.id
        }
      })

      // 방에 플레이어가 없으면 방 삭제
      const remainingPlayers = await tx.tetrisPlayer.count({ where: { roomId } })
      if (remainingPlayers === 0) {
        await tx.tetrisRoom.delete({ where: { id: roomId } })
      } else {
        // 방 상태를 waiting으로 변경
        await tx.tetrisRoom.update({
          where: { id: roomId },
          data: { status: 'waiting' }
        })
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('플레이어 나가기 오류:', error)
    return NextResponse.json({ error: 'Failed to leave room' }, { status: 500 })
  }
}
