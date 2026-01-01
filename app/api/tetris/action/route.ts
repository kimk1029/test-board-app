import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'

export const dynamic = 'force-dynamic'

// 게임 상태 업데이트 (점수, 그리드 등)
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
    const { roomId, score, lines, level, grid, currentPiece, nextPiece, isGameOver } = body

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    // 방 확인
    const room = await prisma.tetrisRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // 플레이어 찾기
    const player = room.players.find(p => p.userId === payload.userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found in room' }, { status: 404 })
    }

    // 플레이어 상태 업데이트
    await prisma.tetrisPlayer.update({
      where: { id: player.id },
      data: {
        score: score ?? player.score,
        lines: lines ?? player.lines,
        level: level ?? player.level,
        isGameOver: isGameOver ?? player.isGameOver,
        grid: grid ?? player.grid,
        currentPiece: currentPiece ?? player.currentPiece,
        nextPiece: nextPiece ?? player.nextPiece
      }
    })

    // 게임 종료 처리 (멀티플레이어 모드)
    if (isGameOver && room.mode === 'multiplayer') {
      const otherPlayers = room.players.filter(p => p.userId !== payload.userId)
      const allGameOver = otherPlayers.every(p => p.isGameOver)

      if (allGameOver) {
        // 모든 플레이어가 게임 오버 - 점수로 승자 결정
        const allPlayers = await prisma.tetrisPlayer.findMany({
          where: { roomId },
          orderBy: { score: 'desc' }
        })

        const winner = allPlayers[0]
        
        // 방 상태 업데이트
        await prisma.tetrisRoom.update({
          where: { id: roomId },
          data: {
            status: 'finished',
            winnerId: winner.userId
          }
        })

        // 승자에게 포인트 보상 (점수 기반)
        const rewardPoints = Math.floor(winner.score / 1000)
        if (rewardPoints > 0) {
          const winnerUser = await prisma.user.findUnique({
            where: { id: winner.userId }
          })

          if (winnerUser) {
            const updatedPoints = parseFloat((winnerUser.points + rewardPoints).toFixed(2))
            const updatedLevel = calculateLevel(updatedPoints)

            await prisma.user.update({
              where: { id: winner.userId },
              data: {
                points: updatedPoints,
                level: updatedLevel
              }
            })

            // 게임 로그 저장
            await prisma.gameLog.create({
              data: {
                userId: winner.userId,
                gameType: 'tetris',
                betAmount: 0,
                payout: rewardPoints,
                profit: rewardPoints,
                result: 'WIN',
                multiplier: 0,
                metadata: {
                  roomId,
                  score: winner.score,
                  lines: winner.lines,
                  mode: 'multiplayer'
                }
              }
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('게임 상태 업데이트 오류:', error)
    return NextResponse.json({ error: 'Failed to update game state' }, { status: 500 })
  }
}

// 최종 점수 저장 (싱글플레이 모드)
export async function PUT(request: NextRequest) {
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
    const { roomId, finalScore, lines, level } = body

    // 싱글플레이 모드는 roomId가 없을 수 있음
    if (!roomId) {
      // roomId 없이 바로 점수 저장
      await prisma.gameScore.create({
        data: {
          userId: payload.userId,
          gameType: 'tetris',
          score: finalScore
        }
      })

      // 높은 점수 기록 시 보상
      const rewardPoints = Math.floor(finalScore / 5000)
      if (rewardPoints > 0) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId }
        })

        if (user) {
          const updatedPoints = parseFloat((user.points + rewardPoints).toFixed(2))
          const updatedLevel = calculateLevel(updatedPoints)

          await prisma.user.update({
            where: { id: payload.userId },
            data: {
              points: updatedPoints,
              level: updatedLevel
            }
          })

          // 게임 로그 저장
          await prisma.gameLog.create({
            data: {
              userId: payload.userId,
              gameType: 'tetris',
              betAmount: 0,
              payout: rewardPoints,
              profit: rewardPoints,
              result: 'WIN',
              multiplier: 0,
              metadata: {
                score: finalScore,
                lines,
                level,
                mode: 'single'
              }
            }
          })
        }
      }

      return NextResponse.json({ success: true })
    }

    // 멀티플레이어 모드 - 방 확인
    const room = await prisma.tetrisRoom.findUnique({
      where: { id: roomId }
    })

    if (!room || room.mode !== 'single') {
      return NextResponse.json({ error: 'Invalid room' }, { status: 400 })
    }

    // 게임 점수 저장
    await prisma.gameScore.create({
      data: {
        userId: payload.userId,
        gameType: 'tetris',
        score: finalScore
      }
    })

    // 높은 점수 기록 시 보상
    const rewardPoints = Math.floor(finalScore / 5000)
    if (rewardPoints > 0) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      })

      if (user) {
        const updatedPoints = parseFloat((user.points + rewardPoints).toFixed(2))
        const updatedLevel = calculateLevel(updatedPoints)

        await prisma.user.update({
          where: { id: payload.userId },
          data: {
            points: updatedPoints,
            level: updatedLevel
          }
        })

        // 게임 로그 저장
        await prisma.gameLog.create({
          data: {
            userId: payload.userId,
            gameType: 'tetris',
            betAmount: 0,
            payout: rewardPoints,
            profit: rewardPoints,
            result: 'WIN',
            multiplier: 0,
            metadata: {
              roomId,
              score: finalScore,
              lines,
              level,
              mode: 'single'
            }
          }
        })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('점수 저장 오류:', error)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }
}
