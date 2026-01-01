import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'

export const dynamic = 'force-dynamic'

// 최고 기록 조회
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAndValidateRequest(request, false)
    
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { error: authResult.error || '인증 실패' },
        { status: authResult.status || 401 }
      )
    }
    
    const payload = authResult.payload

    // 사용자의 테트리스 최고 점수 조회
    const bestScore = await prisma.gameScore.findFirst({
      where: {
        userId: payload.userId,
        gameType: 'tetris'
      },
      orderBy: {
        score: 'desc'
      },
      select: {
        score: true
      }
    })

    return NextResponse.json({
      bestScore: bestScore?.score || 0
    })

  } catch (error) {
    console.error('최고 기록 조회 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch best score' }, { status: 500 })
  }
}
