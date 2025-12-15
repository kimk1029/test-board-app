/**
 * 회원가입 API 테스트
 * 
 * 테스트 케이스:
 * 1. 성공적인 회원가입
 * 2. 필수 필드 누락 (email, password, nickname)
 * 3. 이메일 중복 확인
 * 4. 이메일 인증 미완료
 * 5. 서버 오류 처리
 */

import { POST } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Prisma 모킹
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    emailVerification: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

// Auth 모킹
jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn(),
}))

describe('회원가입 API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // console 출력 억제
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('성공적인 회원가입', async () => {
    const mockHashedPassword = 'hashed_password_123'
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
      password: mockHashedPassword,
      points: 0,
      level: 1,
      userType: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue({
      email: 'test@example.com',
      verified: true,
      createdAt: new Date(),
    })
    ;(hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword)
    ;(prisma.user.create as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.emailVerification.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'TestUser',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('회원가입이 완료되었습니다.')
    expect(data.user).toEqual({
      id: 1,
      email: 'test@example.com',
      nickname: 'TestUser',
    })
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })
    expect(hashPassword).toHaveBeenCalledWith('password123')
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        password: mockHashedPassword,
        nickname: 'TestUser',
      },
    })
    expect(prisma.emailVerification.deleteMany).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })
  })

  it('이메일 누락 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
        nickname: 'TestUser',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이메일과 비밀번호는 필수입니다.')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('비밀번호 누락 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        nickname: 'TestUser',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이메일과 비밀번호는 필수입니다.')
  })

  it('닉네임 누락 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('닉네임은 필수입니다.')
  })

  it('빈 닉네임 시 400 에러', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        nickname: '   ',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('닉네임은 필수입니다.')
  })

  it('이메일 중복 시 400 에러', async () => {
    const existingUser = {
      id: 1,
      email: 'test@example.com',
      nickname: 'ExistingUser',
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'TestUser',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이미 존재하는 이메일입니다.')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('이메일 인증 미완료 시 400 에러', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'TestUser',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('이메일 인증이 완료되지 않았습니다.')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('서버 오류 시 500 에러', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'TestUser',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('서버 오류가 발생했습니다.')
  })
})
