import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        points: true,
        missionRewards: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // missionRewards가 Json이므로 파싱 혹은 그대로 전달
    // Prisma Json 타입은 런타임에 객체/배열로 반환됨
    const rewards = (user.missionRewards as string[]) || []

    return NextResponse.json({
      postCount: user._count.posts,
      commentCount: user._count.comments,
      rewards,
      points: user.points,
    })

  } catch (error) {
    console.error('미션 상태 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

