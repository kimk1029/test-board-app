import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const payload = verifyToken(authHeader.split(' ')[1])
    if (!payload) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    const { gameType, score } = await request.json()

    if (!gameType || typeof score !== 'number') {
      return NextResponse.json({ error: '잘못된 요청 데이터입니다.' }, { status: 400 })
    }

    // 1. Check current highest score before saving new score
    if (gameType === 'stairs') {
        const highestScoreRecord = await prisma.gameScore.findFirst({
            where: { gameType: 'stairs' },
            orderBy: { score: 'desc' }
        })

        const currentHighest = highestScoreRecord ? highestScoreRecord.score : 0

        if (score > currentHighest) {
            // New Record! Trigger Billboard
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, nickname: true, email: true }
            })
            
            if (user) {
                const nickname = user.nickname || user.email.split('@')[0]
                await prisma.billboardEvent.create({
                    data: {
                        userId: user.id,
                        gameType: 'stairs',
                        message: `[STAIRS] ${nickname}님이 무한계단 신기록(${score}층)을 달성하여 1위에 등극했습니다!`
                    }
                })
            }
        }
    }

    // 2. Save Score
    await prisma.gameScore.create({
      data: {
        userId: payload.userId,
        gameType,
        score
      }
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('점수 저장 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
