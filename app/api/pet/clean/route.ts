import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 똥치우기
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

    // 똥이 없으면
    if (pet.poop === 0) {
      return NextResponse.json(
        { error: '치울 똥이 없습니다.' },
        { status: 400 }
      )
    }

    // 똥 제거 및 행복도 증가
    const newPoop = Math.max(0, pet.poop - 1)
    const newHappiness = Math.min(100, pet.happiness + 10) // 똥 치우면 행복도 증가
    const newHealth = Math.min(100, pet.health + 5) // 건강도 약간 회복
    const newExp = pet.exp + 3 // 경험치 증가

    // 레벨업 체크
    let newLevel = pet.level
    if (newExp >= pet.level * 100) {
      newLevel = Math.floor(newExp / 100) + 1
    }

    pet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        poop: newPoop,
        happiness: newHappiness,
        health: newHealth,
        exp: newExp,
        level: newLevel,
        lastCleanedAt: new Date(),
      },
    })

    return NextResponse.json({
      pet,
      message: '똥을 치웠습니다!',
    }, { status: 200 })
  } catch (error) {
    console.error('똥치우기 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
