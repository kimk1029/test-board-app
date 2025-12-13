import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호는 필수입니다.' },
        { status: 400 }
      )
    }

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 구글 로그인 사용자는 비밀번호가 없음
    if (!user.password) {
      return NextResponse.json(
        { error: '이 계정은 구글 로그인을 사용합니다. 구글 로그인을 이용해주세요.' },
        { status: 401 }
      )
    }

    // 비밀번호 확인
    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 하루에 한 번 로그인 포인트 지급
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let updatedPoints = user.points
    let updatedLevel = user.level
    let shouldUpdateLoginDate = false

    if (!user.lastLoginDate || new Date(user.lastLoginDate) < today) {
      // 오늘 첫 로그인 - 포인트 지급
      updatedPoints = user.points + 10
      shouldUpdateLoginDate = true
      
      // 레벨 재계산
      const { calculateLevel } = await import('@/lib/points')
      updatedLevel = calculateLevel(updatedPoints)
    }

    // 사용자 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        points: updatedPoints,
        level: updatedLevel,
        lastLoginDate: shouldUpdateLoginDate ? new Date() : user.lastLoginDate,
      },
    })

    // JWT 토큰 생성
    const token = generateToken({
      userId: updatedUser.id,
      email: updatedUser.email,
    })

    return NextResponse.json(
      {
        message: '로그인 성공',
        token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          nickname: updatedUser.nickname,
          points: updatedUser.points,
          level: updatedUser.level,
        },
        loginBonus: shouldUpdateLoginDate ? 10 : 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('로그인 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

