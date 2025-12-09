import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// 현재 활성 박스 강제 리셋 (모든 티켓을 초기화)
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user || !user.email.endsWith('@test.com')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 현재 활성 박스 찾기
    const activeBox = await prisma.kujiBox.findFirst({
      where: { isActive: true },
    })

    if (activeBox) {
      // 모든 티켓을 초기화
      await prisma.kujiTicket.updateMany({
        where: { boxId: activeBox.id },
        data: {
          isTaken: false,
          takenBy: null,
        },
      })
    }

    return NextResponse.json(
      { message: '박스가 리셋되었습니다.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('박스 리셋 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

