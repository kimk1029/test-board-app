/**
 * 비밀번호 찾기 요청 API 테스트
 * 
 * 테스트 케이스:
 * 1. 성공적인 비밀번호 찾기 요청 (이메일 발송)
 * 2. 필수 필드 누락 (email)
 * 3. 유효하지 않은 이메일 형식
 * 4. 존재하지 않는 이메일 (보안을 위해 성공 메시지 반환)
 * 5. 구글 로그인 사용자 (비밀번호 없음)
 * 6. 기존 토큰 삭제 및 새 토큰 생성
 * 7. 개발 모드 (SMTP 설정 없음)
 * 8. 이메일 발송 실패 (SMTP 설정 있음)
 * 9. 서버 오류 처리
 */

import { POST } from '@/app/api/auth/forgot-password/route'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { NextRequest } from 'next/server'

// Prisma 모킹
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Email 모킹
jest.mock('@/lib/email', () => ({
  sendPasswordResetEmail: jest.fn(),
}))

// 환경 변수 모킹
const originalEnv = process.env

describe('비밀번호 찾기 요청 API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // console 출력 억제
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
    // 환경 변수 초기화
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    jest.restoreAllMocks()
    process.env = originalEnv
  })

  it('성공적인 비밀번호 찾기 요청 (이메일 발송)', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockToken = {
      id: 1,
      userId: 1,
      token: 'reset_token_123',
      expiresAt: new Date(),
      used: false,
      createdAt: new Date(),
    }

    process.env.SMTP_USER = 'test@example.com'
    process.env.SMTP_PASS = 'password123'

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
    ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValue(mockToken)
    ;(sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('비밀번호 재설정 링크가 발송되었습니다. 이메일을 확인해주세요.')
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 1,
        used: false,
      },
    })
    expect(prisma.passwordResetToken.create).toHaveBeenCalled()
    expect(sendPasswordResetEmail).toHaveBeenCalled()
  })

  it('이메일 누락 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이메일이 필요합니다.')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('유효하지 않은 이메일 형식 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('유효하지 않은 이메일 형식입니다.')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('존재하지 않는 이메일 시 성공 메시지 반환 (보안)', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('비밀번호 재설정 링크가 발송되었습니다.')
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled()
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('구글 로그인 사용자 시 400 에러', async () => {
    const mockUser = {
      id: 1,
      email: 'google@example.com',
      nickname: 'GoogleUser',
      password: null, // 구글 로그인 사용자는 비밀번호 없음
      points: 100,
      level: 2,
      userType: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'google@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이 계정은 구글 로그인을 사용합니다. 구글 로그인을 이용해주세요.')
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled()
  })

  it('기존 토큰 삭제 및 새 토큰 생성', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockToken = {
      id: 1,
      userId: 1,
      token: 'new_reset_token',
      expiresAt: new Date(),
      used: false,
      createdAt: new Date(),
    }

    process.env.SMTP_USER = 'test@example.com'
    process.env.SMTP_PASS = 'password123'

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 2 })
    ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValue(mockToken)
    ;(sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 1,
        used: false,
      },
    })
    expect(prisma.passwordResetToken.create).toHaveBeenCalled()
  })

  it('개발 모드 (SMTP 설정 없음) - 토큰 반환', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockToken = {
      id: 1,
      userId: 1,
      token: 'dev_token_123',
      expiresAt: new Date(),
      used: false,
      createdAt: new Date(),
    }

    // SMTP 설정 제거
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
    ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValue(mockToken)
    // sendPasswordResetEmail이 에러를 던지도록 모킹 (개발 모드에서 catch 블록으로 가도록)
    ;(sendPasswordResetEmail as jest.Mock).mockRejectedValue(new Error('Email send failed'))

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('개발 모드')
    expect(data.token).toBeDefined()
    expect(data.resetUrl).toBeDefined()
  })

  it('이메일 발송 실패 (SMTP 설정 있음) - 500 에러', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockToken = {
      id: 1,
      userId: 1,
      token: 'reset_token_123',
      expiresAt: new Date(),
      used: false,
      createdAt: new Date(),
    }

    process.env.SMTP_USER = 'test@example.com'
    process.env.SMTP_PASS = 'password123'

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
    ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValue(mockToken)
    ;(sendPasswordResetEmail as jest.Mock).mockRejectedValue(new Error('Email send failed'))

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('이메일 발송에 실패했습니다.')
  })

  it('서버 오류 시 500 에러', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('서버 오류가 발생했습니다.')
  })
})

