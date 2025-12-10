import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 사용자 포인트 히스토리 조회 (일별)
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
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 최근 30일간의 일별 포인트 데이터 생성
    // 실제로는 포인트 히스토리 테이블이 필요하지만, 
    // 현재는 간단하게 가입일부터 현재까지의 일별 데이터를 생성
    const days = 30
    const history: Array<{ date: string; points: number }> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 가입일부터 현재까지의 일별 데이터 생성
    const joinDate = new Date(user.createdAt)
    joinDate.setHours(0, 0, 0, 0)
    
    // 최근 30일간의 데이터만 생성
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - days)

    // 현재 포인트를 기준으로 역산하여 일별 포인트 추정
    // 실제로는 포인트 히스토리 테이블이 필요하지만, 
    // 현재는 간단하게 현재 포인트를 기준으로 생성
    const currentPoints = user.points
    const daysSinceJoin = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      date.setHours(0, 0, 0, 0)

      // 해당 날짜가 가입일 이전이면 0으로 설정
      if (date < joinDate) {
        history.push({
          date: date.toISOString().split('T')[0],
          points: 0,
        })
      } else {
        // 간단하게 현재 포인트를 기준으로 일별 포인트 추정
        // 실제로는 포인트 히스토리 테이블이 필요
        const daysFromJoin = Math.floor((date.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
        const estimatedPoints = Math.max(0, Math.floor((currentPoints / Math.max(1, daysSinceJoin)) * daysFromJoin))
        
        history.push({
          date: date.toISOString().split('T')[0],
          points: estimatedPoints,
        })
      }
    }

    // 마지막 날짜는 현재 포인트로 설정
    if (history.length > 0) {
      history[history.length - 1].points = currentPoints
    }

    return NextResponse.json(
      {
        history,
        currentPoints,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('포인트 히스토리 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

