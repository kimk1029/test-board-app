import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nickname } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호는 필수입니다.' },
        { status: 400 }
      )
    }

    if (!nickname || nickname.trim() === '') {
      return NextResponse.json(
        { error: '닉네임은 필수입니다.' },
        { status: 400 }
      )
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 존재하는 이메일입니다.' },
        { status: 400 }
      )
    }

    // 이메일 인증 확인
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!verification) {
      return NextResponse.json(
        { error: '이메일 인증이 완료되지 않았습니다.' },
        { status: 400 }
      )
    }

    // 비밀번호 해시화
    const hashedPassword = await hashPassword(password)

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname: nickname.trim(),
      },
    })

    // 인증 코드 삭제 (사용 완료)
    await prisma.emailVerification.deleteMany({
      where: { email },
    })

    return NextResponse.json(
      {
        message: '회원가입이 완료되었습니다.',
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('회원가입 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

