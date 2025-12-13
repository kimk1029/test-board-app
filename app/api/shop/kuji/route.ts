import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const PRIZES = [
  { rank: 'S', name: 'MacBook Pro', probability: 0.001 }, // 0.1%
  { rank: 'A', name: 'iPad Air', probability: 0.005 },    // 0.5%
  { rank: 'B', name: 'AirPods Pro', probability: 0.02 },  // 2%
  { rank: 'C', name: 'Starbucks Gift Card', probability: 0.1 }, // 10%
  { rank: 'D', name: '1000 Points', probability: 0.2 },   // 20%
  { rank: 'E', name: '100 Points (Refunding)', probability: 0.3 }, // 30%
  { rank: 'F', name: 'Boom! (Better luck next time)', probability: 0.374 } // 37.4%
]

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    // 1. Check Points
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.points < 100) {
      return NextResponse.json({ error: '포인트가 부족합니다. (100P 필요)' }, { status: 400 })
    }

    // 2. Determine Prize
    const rand = Math.random()
    let cumulative = 0
    let selected = PRIZES[PRIZES.length - 1]

    for (const prize of PRIZES) {
      cumulative += prize.probability
      if (rand < cumulative) {
        selected = prize
        break
      }
    }

    // 3. Process Transaction
    await prisma.$transaction(async (tx) => {
      // Deduct Cost
      await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: 100 } }
      })

      // Award Points if applicable
      let payout = 0
      if (selected.name.includes('Points')) {
          const match = selected.name.match(/(\d+) Points/)
          if (match) {
              payout = parseInt(match[1])
              if (payout > 0) {
                  await tx.user.update({
                      where: { id: user.id },
                      data: { points: { increment: payout } }
                  })
              }
          }
      }

      // Log Game Result (for stats)
      await tx.gameLog.create({
        data: {
          userId: user.id,
          gameType: 'kuji',
          betAmount: 100,
          payout: payout,
          profit: payout - 100,
          result: payout >= 1000 ? 'JACKPOT' : (payout > 100 ? 'WIN' : 'LOSE'),
          metadata: { rank: selected.rank, prizeName: selected.name }
        }
      })
    })

    return NextResponse.json({ 
        success: true, 
        prize: selected,
        remainingPoints: user.points - 100 + (selected.name.includes('Points') ? parseInt(selected.name.match(/(\d+) Points/)?.[1] || '0') : 0)
    })

  } catch (error) {
    console.error('Kuji Error:', error)
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 })
  }
}
