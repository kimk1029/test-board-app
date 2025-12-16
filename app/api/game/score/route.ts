import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { 
  validateScore, 
  validateScoreReasonableness, 
  checkScoreRateLimit 
} from '@/lib/score-validation'

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

    // Rate limiting 체크
    const rateLimitCheck = checkScoreRateLimit(payload.userId)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error || '너무 빠른 요청입니다.' },
        { status: 429 }
      )
    }

    const { gameType, score, gameDuration } = await request.json()

    if (!gameType || typeof score !== 'number') {
      return NextResponse.json({ error: '잘못된 요청 데이터입니다.' }, { status: 400 })
    }

    // 이전 최고 점수 조회 (증가율 검증용)
    const previousBestScore = await prisma.gameScore.findFirst({
      where: {
        userId: payload.userId,
        gameType
      },
      orderBy: { score: 'desc' }
    })

    // 점수 검증
    const scoreValidation = validateScore(
      gameType,
      score,
      payload.userId,
      previousBestScore?.score
    )

    if (!scoreValidation.valid) {
      return NextResponse.json(
        { error: scoreValidation.error || '점수가 유효하지 않습니다.' },
        { status: 400 }
      )
    }

    // 점수 합리성 검증 (게임 시간이 제공된 경우)
    if (gameDuration && typeof gameDuration === 'number') {
      const reasonablenessCheck = validateScoreReasonableness(
        gameType,
        score,
        gameDuration
      )

      if (!reasonablenessCheck.valid) {
        return NextResponse.json(
          { error: reasonablenessCheck.error || '점수가 비정상적입니다.' },
          { status: 400 }
        )
      }
    }

    // 1. Check current highest score before saving new score
    const gameTypesWithRanking = ['stairs', 'skyroads', 'windrunner']
    if (gameTypesWithRanking.includes(gameType)) {
        const highestScoreRecord = await prisma.gameScore.findFirst({
            where: { gameType },
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
                const gameNames: { [key: string]: string } = {
                    'stairs': '무한계단',
                    'skyroads': '스카이로드',
                    'windrunner': '윈드러너'
                }
                const gameName = gameNames[gameType] || gameType
                const scoreUnit: { [key: string]: string } = {
                    'stairs': '층',
                    'skyroads': 'KM',
                    'windrunner': 'PTS'
                }
                const unit = scoreUnit[gameType] || ''
                
                await prisma.billboardEvent.create({
                    data: {
                        userId: user.id,
                        gameType,
                        message: `[${gameName.toUpperCase()}] ${nickname}님이 ${gameName} 신기록(${score}${unit})을 달성하여 1위에 등극했습니다!`
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
