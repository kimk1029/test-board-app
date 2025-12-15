/**
 * 로그인 API 테스트
 * 
 * 테스트 케이스:
 * 1. 성공적인 로그인
 * 2. 필수 필드 누락 (email, password)
 * 3. 존재하지 않는 사용자
 * 4. 잘못된 비밀번호
 * 5. 구글 로그인 사용자 (비밀번호 없음)
 * 6. 로그인 보너스 지급 (하루에 한 번)
 * 7. 서버 오류 처리
 */

import { POST } from '@/app/api/auth/login/route'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Prisma 모킹
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

// Auth 모킹
jest.mock('@/lib/auth', () => ({
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
}))

// Points 모킹
jest.mock('@/lib/points', () => ({
  calculateLevel: jest.fn((points: number) => {
    if (points < 100) return 1
    if (points < 500) return 2
    if (points < 1000) return 3
    return 4
  }),
}))

describe('로그인 API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // console 출력 억제
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('성공적인 로그인 (보너스 없음)', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      lastLoginDate: new Date(), // 오늘 이미 로그인함
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockToken = 'jwt_token_123'

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(comparePassword as jest.Mock).mockResolvedValue(true)
    ;(generateToken as jest.Mock).mockReturnValue(mockToken)
    ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('로그인 성공')
    expect(data.token).toBe(mockToken)
    expect(data.user).toEqual({
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      points: 100,
      level: 2,
    })
    expect(data.loginBonus).toBe(0)
    expect(comparePassword).toHaveBeenCalledWith('password123', 'hashed_password')
    expect(generateToken).toHaveBeenCalledWith({
      userId: 1,
      email: 'test@example.com',
    })
  })

  it('성공적인 로그인 (보너스 지급)', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      lastLoginDate: yesterday, // 어제 로그인함
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedUser = {
      ...mockUser,
      points: 110, // +10 포인트
      level: 2,
      lastLoginDate: new Date(),
    }

    const mockToken = 'jwt_token_123'

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(comparePassword as jest.Mock).mockResolvedValue(true)
    ;(generateToken as jest.Mock).mockReturnValue(mockToken)
    ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.loginBonus).toBe(10)
    expect(data.user.points).toBe(110)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        points: 110,
        level: 2,
        lastLoginDate: expect.any(Date),
      },
    })
  })

  it('이메일 누락 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이메일과 비밀번호는 필수입니다.')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('비밀번호 누락 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이메일과 비밀번호는 필수입니다.')
  })

  it('존재하지 않는 사용자 시 401 에러', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    expect(comparePassword).not.toHaveBeenCalled()
  })

  it('잘못된 비밀번호 시 401 에러', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: 'hashed_password',
      points: 100,
      level: 2,
      userType: 0,
      lastLoginDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(comparePassword as jest.Mock).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrong_password',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    expect(comparePassword).toHaveBeenCalledWith('wrong_password', 'hashed_password')
    expect(generateToken).not.toHaveBeenCalled()
  })

  it('구글 로그인 사용자 시 401 에러', async () => {
    const mockUser = {
      id: 1,
      email: 'google@example.com',
      nickname: 'GoogleUser',
      password: null, // 구글 로그인 사용자는 비밀번호 없음
      points: 100,
      level: 2,
      userType: 0,
      lastLoginDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'google@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('이 계정은 구글 로그인을 사용합니다. 구글 로그인을 이용해주세요.')
    expect(comparePassword).not.toHaveBeenCalled()
  })

  it('서버 오류 시 500 에러', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('서버 오류가 발생했습니다.')
  })
})
