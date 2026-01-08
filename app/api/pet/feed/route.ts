import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 밥주기
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

    // 쿨다운 체크 (5분)
    const now = new Date()
    if (pet.lastFedAt) {
      const minutesSinceFeed = (now.getTime() - pet.lastFedAt.getTime()) / (1000 * 60)
      if (minutesSinceFeed < 5) {
        return NextResponse.json(
          { error: `아직 배가 부릅니다. ${Math.ceil(5 - minutesSinceFeed)}분 후에 다시 시도해주세요.` },
          { status: 400 }
        )
      }
    }

    // 배고픔 증가 (최대 100)
    const newHunger = Math.min(100, pet.hunger + 30)
    const newHappiness = Math.min(100, pet.happiness + 5) // 밥주면 행복도도 약간 증가
    const newPoop = Math.min(5, pet.poop + 1) // 밥을 먹으면 똥 생성 (최대 5개)
    const newExp = pet.exp + 5 // 경험치 증가

    // 레벨업 체크 (경험치 100당 레벨 1 증가)
    let newLevel = pet.level
    if (newExp >= pet.level * 100) {
      newLevel = Math.floor(newExp / 100) + 1
    }

    pet = await prisma.pet.update({
      where: { id: pet.id },
      data: {
        hunger: newHunger,
        happiness: newHappiness,
        poop: newPoop,
        exp: newExp,
        level: newLevel,
        lastFedAt: now,
      },
    })

    return NextResponse.json({
      pet,
      message: '맛있는 밥을 먹었습니다!',
    }, { status: 200 })
  } catch (error) {
    console.error('밥주기 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
