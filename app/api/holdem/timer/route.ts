import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAutoFold, handleAutoStartNextGame, RoomWithPlayers } from '@/lib/holdem/game-logic'

export const dynamic = 'force-dynamic'

// 타이머 체크 및 자동 처리 API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId } = body

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 방과 플레이어 정보 가져오기
      const room = await tx.holdemRoom.findUnique({
        where: { id: roomId },
        include: { players: true }
      })

      if (!room) {
        throw new Error('Room not found')
      }

      let hasUpdates = false
      let roomUpdates: any = {}
      let playerUpdates: any[] = []

      // 1. 자동 fold 체크 (게임 진행 중일 때)
      if (room.status === 'playing' && room.currentRound !== 'showdown') {
        const autoFoldResult = handleAutoFold(room as RoomWithPlayers)
        if (autoFoldResult) {
          hasUpdates = true
          roomUpdates = { ...roomUpdates, ...autoFoldResult.roomUpdates }
          playerUpdates = [...playerUpdates, ...autoFoldResult.playerUpdates]
        }
      }

      // 2. 자동 다음 게임 시작 체크 (showdown 후)
      if (room.status === 'finished' && room.currentRound === 'showdown') {
        const autoStartResult = handleAutoStartNextGame(room as RoomWithPlayers)
        if (autoStartResult) {
          hasUpdates = true
          roomUpdates = { ...roomUpdates, ...autoStartResult.roomUpdates }
          playerUpdates = [...playerUpdates, ...autoStartResult.playerUpdates]
        }
      }

      // 업데이트가 있으면 DB에 반영
      if (hasUpdates) {
        await tx.holdemRoom.update({
          where: { id: roomId },
          data: roomUpdates
        })

        for (const update of playerUpdates) {
          await tx.holdemPlayer.update({
            where: {
              roomId_userId: {
                roomId,
                userId: update.userId
              }
            },
            data: update.data
          })
        }
      }

      return { hasUpdates, roomUpdates, playerUpdates }
    })

    return NextResponse.json({ success: true, ...result })

  } catch (error: any) {
    console.error('타이머 체크 오류:', error)
    return NextResponse.json({ error: error.message || 'Failed to check timer' }, { status: 500 })
  }
}

