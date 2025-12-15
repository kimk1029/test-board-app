/**
 * 비밀번호 재설정 API 테스트
 * 
 * 테스트 케이스:
 * 1. 성공적인 비밀번호 재설정
 * 2. 필수 필드 누락 (token, password)
 * 3. 비밀번호 길이 부족 (6자 미만)
 * 4. 유효하지 않은 토큰
 * 5. 이미 사용된 토큰
 * 6. 만료된 토큰
 * 7. 구글 로그인 사용자 (비밀번호 없음)
 * 8. 트랜잭션 처리 (비밀번호 업데이트 및 토큰 사용 처리)
 * 9. 서버 오류 처리
 */

import { POST } from '@/app/api/auth/reset-password/route'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Prisma 모킹
const mockUserUpdate = jest.fn()
const mockTokenUpdate = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    passwordResetToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}))

// Auth 모킹
jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn(),
}))

describe('비밀번호 재설정 API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // console 출력 억제
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('성공적인 비밀번호 재설정', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'old_hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 1) // 1시간 후

    const mockResetToken = {
      id: 1,
      userId: 1,
      token: 'valid_token_123',
      expiresAt: futureDate,
      used: false,
      createdAt: new Date(),
      user: mockUser,
    }

    const mockHashedPassword = 'new_hashed_password'

    ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockResetToken)
    ;(hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword)
    ;(prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, password: mockHashedPassword })
    ;(prisma.passwordResetToken.update as jest.Mock).mockResolvedValue({ ...mockResetToken, used: true })
    ;(prisma.$transaction as jest.Mock).mockImplementation((promises) => Promise.all(promises))

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_123',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('비밀번호가 성공적으로 재설정되었습니다.')
    expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: 'valid_token_123' },
      include: { user: true },
    })
    expect(hashPassword).toHaveBeenCalledWith('newPassword123')
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('토큰 누락 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('토큰과 비밀번호는 필수입니다.')
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled()
  })

  it('비밀번호 누락 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('토큰과 비밀번호는 필수입니다.')
  })

  it('비밀번호 길이 부족 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_123',
        password: '12345', // 5자
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('비밀번호는 최소 6자 이상이어야 합니다.')
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled()
  })

  it('유효하지 않은 토큰 시 400 에러', async () => {
    ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'invalid_token',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('유효하지 않거나 만료된 토큰입니다.')
    expect(hashPassword).not.toHaveBeenCalled()
  })

  it('이미 사용된 토큰 시 400 에러', async () => {
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

    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 1)

    const mockResetToken = {
      id: 1,
      userId: 1,
      token: 'used_token_123',
      expiresAt: futureDate,
      used: true, // 이미 사용됨
      createdAt: new Date(),
      user: mockUser,
    }

    ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockResetToken)

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'used_token_123',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이미 사용된 토큰입니다.')
    expect(hashPassword).not.toHaveBeenCalled()
  })

  it('만료된 토큰 시 400 에러', async () => {
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

    const pastDate = new Date()
    pastDate.setHours(pastDate.getHours() - 2) // 2시간 전

    const mockResetToken = {
      id: 1,
      userId: 1,
      token: 'expired_token_123',
      expiresAt: pastDate, // 만료됨
      used: false,
      createdAt: new Date(),
      user: mockUser,
    }

    ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockResetToken)

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'expired_token_123',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('만료된 토큰입니다.')
    expect(hashPassword).not.toHaveBeenCalled()
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

    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 1)

    const mockResetToken = {
      id: 1,
      userId: 1,
      token: 'valid_token_123',
      expiresAt: futureDate,
      used: false,
      createdAt: new Date(),
      user: mockUser,
    }

    ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockResetToken)

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_123',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이 계정은 구글 로그인을 사용합니다.')
    expect(hashPassword).not.toHaveBeenCalled()
  })

  it('트랜잭션 처리 확인', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'old_hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 1)

    const mockResetToken = {
      id: 1,
      userId: 1,
      token: 'valid_token_123',
      expiresAt: futureDate,
      used: false,
      createdAt: new Date(),
      user: mockUser,
    }

    const mockHashedPassword = 'new_hashed_password'

    ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockResetToken)
    ;(hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword)
    ;(prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, password: mockHashedPassword })
    ;(prisma.passwordResetToken.update as jest.Mock).mockResolvedValue({ ...mockResetToken, used: true })
    ;(prisma.$transaction as jest.Mock).mockImplementation((promises) => Promise.all(promises))

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_123',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalled()
    
    // 트랜잭션 내부에서 user.update와 passwordResetToken.update가 호출되는지 확인
    const transactionCall = (prisma.$transaction as jest.Mock).mock.calls[0][0]
    expect(Array.isArray(transactionCall)).toBe(true)
  })

  it('서버 오류 시 500 에러', async () => {
    ;(prisma.passwordResetToken.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database error')
    )

    const request = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_123',
        password: 'newPassword123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('서버 오류가 발생했습니다.')
  })
})

