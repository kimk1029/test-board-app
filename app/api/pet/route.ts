import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 펫 상태 조회 및 자동 감소 처리
export async function GET(request: NextRequest) {
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

    // 펫이 없으면 생성
    if (!pet) {
      pet = await prisma.pet.create({
        data: {
          userId: payload.userId,
          name: '펫',
          hunger: 80,
          happiness: 80,
          health: 100,
          poop: 0,
          lastDecayAt: new Date(),
        },
      })
    } else {
      // 상태 자동 감소 처리 (1분마다)
      const now = new Date()
      const lastDecay = pet.lastDecayAt
      const minutesSinceDecay = Math.floor((now.getTime() - lastDecay.getTime()) / (1000 * 60))

      if (minutesSinceDecay > 0) {
        const decayAmount = Math.min(minutesSinceDecay, 60) // 최대 60분까지만 감소

        let newHunger = Math.max(0, pet.hunger - decayAmount * 0.5) // 1분당 0.5씩 감소
        let newHappiness = Math.max(0, pet.happiness - decayAmount * 0.3) // 1분당 0.3씩 감소
        let newHealth = pet.health

        // 배고픔이 0이면 건강 감소
        if (newHunger === 0) {
          newHealth = Math.max(0, pet.health - decayAmount * 0.2)
        }

        // 행복도가 0이면 건강 감소
        if (newHappiness === 0) {
          newHealth = Math.max(0, newHealth - decayAmount * 0.1)
        }

        // 똥이 5개 이상이면 건강 감소
        if (pet.poop >= 5) {
          newHealth = Math.max(0, newHealth - decayAmount * 0.3)
        }

        pet = await prisma.pet.update({
          where: { id: pet.id },
          data: {
            hunger: newHunger,
            happiness: newHappiness,
            health: newHealth,
            lastDecayAt: now,
          },
        })
      }
    }

    return NextResponse.json(pet, { status: 200 })
  } catch (error) {
    console.error('펫 상태 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 펫 생성
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

    // 이미 펫이 있는지 확인
    const existingPet = await prisma.pet.findUnique({
      where: { userId: payload.userId },
    })

    if (existingPet) {
      return NextResponse.json(
        { error: '이미 펫이 있습니다.' },
        { status: 400 }
      )
    }

    const { name } = await request.json()

    const pet = await prisma.pet.create({
      data: {
        userId: payload.userId,
        name: name || '펫',
        hunger: 80,
        happiness: 80,
        health: 100,
        poop: 0,
        lastDecayAt: new Date(),
      },
    })

    return NextResponse.json(pet, { status: 201 })
  } catch (error) {
    console.error('펫 생성 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
