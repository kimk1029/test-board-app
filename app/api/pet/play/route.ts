import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 놀아주기
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    let pet = await prisma.pet.findUnique({
      where: { userId: payload.userId },
    })

    if (!pet) {
      return NextResponse.json(
        { error: '펫이 없습니다. 먼저 펫을 생성해주세요.' },
        { status: 404 }
      )
    }

    // 쿨다운 체크 (3분)
    const now = new Date()
    if (pet.lastPlayedAt) {
      const minutesSincePlay = (now.getTime() - pet.lastPlayedAt.getTime()) / (1000 * 60)
      if (minutesSincePlay < 3) {
        return NextResponse.json(
          { error: `펫이 지쳤습니다. ${Math.ceil(3 - minutesSincePlay)}분 후에 다시 시도해주세요.` },
          { status: 400 }
        )
      }
    }

    // 행복도 증가 (최대 100)
    const newHappiness = Math.min(100, pet.happiness + 25)
    const newExp = pet.exp + 10 // 경험치 증가

    // 레벨업 체크
    let newLevel = pet.level
    if (newExp >= pet.level * 100) {
      newLevel = Math.floor(newExp / 100) + 1
    }

    pet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        happiness: newHappiness,
        exp: newExp,
        level: newLevel,
        lastPlayedAt: now,
      },
    })

    return NextResponse.json({
      pet,
      message: '펫이 즐겁게 놀았습니다!',
    }, { status: 200 })
  } catch (error) {
    console.error('놀아주기 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
