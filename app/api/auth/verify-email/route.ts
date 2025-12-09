import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 이메일 인증 코드 검증
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json(
        { error: '이메일과 인증 코드가 필요합니다.' },
        { status: 400 }
      )
    }

    // 인증 코드 조회
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!verification) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 코드입니다.' },
        { status: 400 }
      )
    }

    // 만료 시간 확인
    if (new Date() > verification.expiresAt) {
      return NextResponse.json(
        { error: '인증 코드가 만료되었습니다. 다시 발송해주세요.' },
        { status: 400 }
      )
    }

    // 인증 완료 처리
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    })

    return NextResponse.json(
      { message: '이메일 인증이 완료되었습니다.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('이메일 인증 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

