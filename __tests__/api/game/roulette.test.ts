/**
 * 룰렛 게임 API 테스트
 * 
 * 테스트 케이스:
 * 1. 보안 검증 (인증, 권한)
 * 2. 베팅 검증 (금액, 포인트 부족)
 * 3. 게임 진행 (당첨 번호 생성, 지급액 계산)
 * 4. 결과 검증 (승리/패배, 전광판 이벤트)
 * 5. 에러 케이스
 */

import { POST } from '@/app/api/game/roulette/route'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'
import {
  generateWinningNumber,
  calculateRoulettePayout,
} from '@/lib/game-servers/roulette-server'
import { NextRequest } from 'next/server'

// Prisma 모킹
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    gameLog: {
      create: jest.fn(),
    },
    billboardEvent: {
      create: jest.fn(),
    },
  },
}))

// Auth 모킹
jest.mock('@/lib/request-auth', () => ({
  authenticateAndValidateRequest: jest.fn(),
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

// 룰렛 서버 로직 모킹
const mockGenerateWinningNumber = jest.fn()
const mockCalculateRoulettePayout = jest.fn()

jest.mock('@/lib/game-servers/roulette-server', () => ({
  generateWinningNumber: (...args: any[]) => mockGenerateWinningNumber(...args),
  calculateRoulettePayout: (...args: any[]) => mockCalculateRoulettePayout(...args),
}))

describe('룰렛 게임 API', () => {
  const mockUserId = 1
  const mockPayload = { userId: mockUserId, email: 'test@example.com' }
  const mockToken = 'Bearer test_token'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})

    // 기본 인증 모킹
    ;(authenticateAndValidateRequest as jest.Mock).mockResolvedValue({
      valid: true,
      payload: mockPayload,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('보안 검증', () => {
    it('인증 실패 시 401 에러', async () => {
      ;(authenticateAndValidateRequest as jest.Mock).mockResolvedValue({
        valid: false,
        error: '인증 실패',
        status: 401,
      })

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets: { red: 100 },
          totalBet: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('인증 실패')
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('토큰 없이 요청 시 401 에러', async () => {
      ;(authenticateAndValidateRequest as jest.Mock).mockResolvedValue({
        valid: false,
        error: '인증이 필요합니다.',
        status: 401,
      })

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'spin',
          bets: { red: 100 },
          totalBet: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('인증이 필요합니다.')
    })
  })

  describe('베팅 검증', () => {
    it('베팅이 없으면 400 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets: {},
          totalBet: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('베팅이 필요합니다.')
    })

    it('베팅 금액이 유효하지 않으면 400 에러 (0원)', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets: { red: 100 },
          totalBet: 0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('베팅 금액이 유효하지 않습니다.')
    })

    it('베팅 금액이 최대값 초과 시 400 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 2000000,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets: { red: 1000001 },
          totalBet: 1000001,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('베팅 금액이 유효하지 않습니다.')
    })

    it('포인트가 부족하면 400 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 50,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets: { red: 100 },
          totalBet: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('포인트가 부족합니다.')
    })
  })

  describe('게임 진행 및 결과', () => {
    it('성공적인 스핀 - 승리 (빨강 베팅)', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        nickname: 'TestUser',
        points: 1000,
        level: 2,
      }

      const bets = { red: 100 }
      const totalBet = 100
      const winningNumber = 1 // 빨강 숫자
      const payout = 200 // 100 * 2 (원금 + 배당)

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateWinningNumber.mockReturnValue(winningNumber)
      mockCalculateRoulettePayout.mockReturnValue(payout)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1100, // 1000 - 100 + 200
        level: 3,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets,
          totalBet,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.winningNumber).toBe(winningNumber)
      expect(data.payout).toBe(payout)
      expect(data.points).toBe(1100)
      expect(data.pointsChange).toBe(100) // 200 - 100
      expect(mockGenerateWinningNumber).toHaveBeenCalled()
      expect(mockCalculateRoulettePayout).toHaveBeenCalledWith(winningNumber, bets)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          points: 1100,
          level: 4, // 1100 포인트는 레벨 4
        },
      })
      expect(prisma.gameLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'roulette',
          betAmount: totalBet,
          payout: payout,
          profit: 100,
          result: 'WIN',
          multiplier: 2,
        },
      })
    })

    it('성공적인 스핀 - 패배', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
        level: 2,
      }

      const bets = { red: 100 }
      const totalBet = 100
      const winningNumber = 2 // 검정 숫자
      const payout = 0

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateWinningNumber.mockReturnValue(winningNumber)
      mockCalculateRoulettePayout.mockReturnValue(payout)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 900, // 1000 - 100
        level: 2,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets,
          totalBet,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.winningNumber).toBe(winningNumber)
      expect(data.payout).toBe(0)
      expect(data.points).toBe(900)
      expect(data.pointsChange).toBe(-100)
      expect(prisma.gameLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'roulette',
          betAmount: totalBet,
          payout: 0,
          profit: -100,
          result: 'LOSE',
          multiplier: 0,
        },
      })
    })

    it('단일 숫자 적중 시 전광판 이벤트 생성', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        nickname: 'TestUser',
        points: 1000,
        level: 2,
      }

      const bets = { n_1: 10 } // 단일 숫자 베팅
      const totalBet = 10
      const winningNumber = 1
      const payout = 360 // 10 * 35 + 10 (원금)

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateWinningNumber.mockReturnValue(winningNumber)
      mockCalculateRoulettePayout.mockReturnValue(payout)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1350,
        level: 3,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})
      ;(prisma.billboardEvent.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets,
          totalBet,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.payout).toBe(payout)
      // 배당률이 30배 이상이면 전광판 이벤트 생성
      expect(prisma.billboardEvent.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'roulette',
          message: expect.stringContaining('[ROULETTE]'),
        },
      })
    })

    it('다양한 베팅 조합 테스트', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
        level: 2,
      }

      const bets = {
        red: 50,
        even: 30,
        low: 20,
      }
      const totalBet = 100
      const winningNumber = 2 // 검정, 짝수, 낮은 수
      const payout = 100 // even, low 적중

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateWinningNumber.mockReturnValue(winningNumber)
      mockCalculateRoulettePayout.mockReturnValue(payout)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1000, // 1000 - 100 + 100
        level: 2,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets,
          totalBet,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockCalculateRoulettePayout).toHaveBeenCalledWith(winningNumber, bets)
    })
  })

  describe('에러 케이스', () => {
    it('유효하지 않은 액션이면 400 에러', async () => {
      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'invalid_action',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('유효하지 않은 액션입니다.')
    })

    it('사용자를 찾을 수 없으면 404 에러', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets: { red: 100 },
          totalBet: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('사용자를 찾을 수 없습니다.')
    })

    it('서버 오류 시 500 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.update as jest.Mock).mockRejectedValue(new Error('DB 오류'))

      const request = new NextRequest('http://localhost/api/game/roulette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          bets: { red: 100 },
          totalBet: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('서버 오류가 발생했습니다.')
    })
  })
})

