import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 현재 로그인한 사용자 정보 조회
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

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          nickname: true,
          points: true,
          level: true,
          userType: true,
          createdAt: true,
        },
      })

      if (!user) {
        return NextResponse.json(
          { error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json(user, { status: 200 })
    } catch (dbError: any) {
      // 데이터베이스 연결 오류 처리
      console.error('데이터베이스 연결 오류:', dbError)
      
      // Prisma 연결 오류인 경우
      if (dbError.code === 'P1001' || dbError.message?.includes('Can\'t reach database server')) {
        return NextResponse.json(
          { error: '데이터베이스 연결에 실패했습니다. 서버를 확인해주세요.' },
          { status: 503 } // Service Unavailable
        )
      }
      
      // 기타 데이터베이스 오류
      throw dbError
    }
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

