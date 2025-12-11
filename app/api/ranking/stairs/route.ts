import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch top scores (fetch more than limit to handle duplicate users)
    const rawScores = await prisma.gameScore.findMany({
      where: {
        gameType: 'stairs'
      },
      orderBy: {
        score: 'desc'
      },
      take: 50,
      include: {
        user: {
            select: {
                id: true,
                nickname: true,
                email: true,
                level: true
            }
        }
      }
    })

    // 2. Deduplicate users (keep highest score per user)
    const uniqueMap = new Map<number, any>()
    const rankings = []

    for (const record of rawScores) {
        if (!uniqueMap.has(record.userId)) {
            uniqueMap.set(record.userId, true)
            rankings.push({
                userId: record.userId,
                nickname: record.user.nickname || record.user.email.split('@')[0],
                email: record.user.email,
                level: record.user.level,
                score: record.score,
                rank: rankings.length + 1
            })
        }
        if (rankings.length >= 10) break
    }

    return NextResponse.json({ rankings }, { status: 200 })

  } catch (error) {
    console.error('계단오르기 랭킹 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

