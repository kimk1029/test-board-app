import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

// 비밀번호 찾기 요청 (이메일로 재설정 링크 전송)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '유효하지 않은 이메일 형식입니다.' },
        { status: 400 }
      )
    }

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // 보안을 위해 존재하지 않는 이메일이어도 성공 메시지 반환
    // (이메일 열거 공격 방지)
    if (!user) {
      return NextResponse.json(
        { message: '비밀번호 재설정 링크가 발송되었습니다.' },
        { status: 200 }
      )
    }

    // 구글 로그인 사용자는 비밀번호가 없음
    if (!user.password) {
      return NextResponse.json(
        { error: '이 계정은 구글 로그인을 사용합니다. 구글 로그인을 이용해주세요.' },
        { status: 400 }
      )
    }

    // 기존 토큰 삭제 (사용되지 않은 것만)
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    })

    // 새 토큰 생성
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1시간 후 만료

    // 토큰 저장
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // 이메일 발송
    const hasSmtpConfig = !!(process.env.SMTP_USER && process.env.SMTP_PASS)
    
    try {
      await sendPasswordResetEmail(email, token)
    } catch (error) {
      console.error('이메일 발송 실패:', error)
      // SMTP 설정이 없으면 개발 모드로 토큰을 반환
      if (!hasSmtpConfig) {
        return NextResponse.json(
          {
            message: '비밀번호 재설정 토큰이 생성되었습니다. (개발 모드 - 이메일 설정이 없습니다)',
            token: token, // 개발 모드에서만 토큰 반환
            resetUrl: `${process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://dopamine.land' : 'http://localhost:3000')}/reset-password?token=${token}`,
          },
          { status: 200 }
        )
      }
      // SMTP 설정이 있는데 발송 실패한 경우
      return NextResponse.json(
        { error: '이메일 발송에 실패했습니다.' },
        { status: 500 }
      )
    }

    // SMTP 설정이 있으면 정상 메시지만 반환
    return NextResponse.json(
      {
        message: '비밀번호 재설정 링크가 발송되었습니다. 이메일을 확인해주세요.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('비밀번호 찾기 요청 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

