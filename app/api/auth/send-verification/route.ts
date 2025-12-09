import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'

// 이메일 인증 코드 발송
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

    // 이미 가입된 이메일인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다.' },
        { status: 400 }
      )
    }

    // 6자리 인증 코드 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 만료 시간 (10분 후)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // 기존 인증 코드가 있으면 삭제
    await prisma.emailVerification.deleteMany({
      where: { email },
    })

    // 새 인증 코드 저장
    await prisma.emailVerification.create({
      data: {
        email,
        code,
        expiresAt,
      },
    })

    // 이메일 발송
    try {
      await sendVerificationEmail(email, code)
    } catch (error) {
      console.error('이메일 발송 실패:', error)
      // 개발 환경이거나 SMTP 설정이 없으면 코드를 반환
      if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return NextResponse.json(
          {
            message: '인증 코드가 생성되었습니다. (개발 모드 - 이메일 설정이 없습니다)',
            code: code, // 개발 환경에서만 코드 반환
          },
          { status: 200 }
        )
      }
      return NextResponse.json(
        { error: '이메일 발송에 실패했습니다.' },
        { status: 500 }
      )
    }

    // SMTP 설정이 있으면 정상 메시지, 없으면 개발 모드 메시지
    const message = (process.env.SMTP_USER && process.env.SMTP_PASS)
      ? '인증 코드가 발송되었습니다. 이메일을 확인해주세요.'
      : '인증 코드가 생성되었습니다. (개발 모드)'

    return NextResponse.json(
      {
        message,
        ...(process.env.NODE_ENV === 'development' || (!process.env.SMTP_USER || !process.env.SMTP_PASS) ? { code } : {}),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('인증 코드 발송 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

