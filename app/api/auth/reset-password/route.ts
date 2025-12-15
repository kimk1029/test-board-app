import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

// 비밀번호 재설정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: '토큰과 비밀번호는 필수입니다.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // 토큰으로 재설정 요청 찾기
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 토큰입니다.' },
        { status: 400 }
      )
    }

    // 이미 사용된 토큰인지 확인
    if (resetToken.used) {
      return NextResponse.json(
        { error: '이미 사용된 토큰입니다.' },
        { status: 400 }
      )
    }

    // 만료 시간 확인
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: '만료된 토큰입니다.' },
        { status: 400 }
      )
    }

    // 구글 로그인 사용자는 비밀번호가 없음
    if (!resetToken.user.password) {
      return NextResponse.json(
        { error: '이 계정은 구글 로그인을 사용합니다.' },
        { status: 400 }
      )
    }

    // 비밀번호 해시화
    const hashedPassword = await hashPassword(password)

    // 비밀번호 업데이트 및 토큰 사용 처리
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ])

    return NextResponse.json(
      { message: '비밀번호가 성공적으로 재설정되었습니다.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

