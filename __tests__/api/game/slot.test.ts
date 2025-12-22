/**
 * 슬롯머신 게임 API 테스트
 * 
 * 테스트 케이스:
 * 1. 보안 검증 (인증, 권한)
 * 2. 베팅 검증 (금액, 포인트 부족)
 * 3. 게임 진행 (심볼 조합 생성, 지급액 계산)
 * 4. 결과 검증 (승리/패배, 잭팟, 전광판 이벤트)
 * 5. 에러 케이스
 */

import { POST } from '@/app/api/game/slot/route'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'
import {
  generateSlotMatrix,
  calculateSlotPayout,
} from '@/lib/game-servers/slot-server'
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

// 슬롯 서버 로직 모킹
const mockGenerateSlotMatrix = jest.fn()
const mockCalculateSlotPayout = jest.fn()

jest.mock('@/lib/game-servers/slot-server', () => ({
  generateSlotMatrix: (...args: any[]) => mockGenerateSlotMatrix(...args),
  calculateSlotPayout: (...args: any[]) => mockCalculateSlotPayout(...args),
}))

describe('슬롯머신 게임 API', () => {
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

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('인증 실패')
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('베팅 검증', () => {
    it('베팅 금액이 유효하지 않으면 400 에러 (0원)', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount: 0,
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

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount: 1000001,
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

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('포인트가 부족합니다.')
    })
  })

  describe('게임 진행 및 결과', () => {
    it('성공적인 스핀 - 승리', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        nickname: 'TestUser',
        points: 1000,
        level: 2,
      }

      const betAmount = 100
      const multiplier = 1
      const matrix = [
        ['🍒', '🍒', '🍒'],
        ['🍋', '🍋', '🍋'],
        ['🍊', '🍊', '🍊'],
      ]
      const payout = 200
      const comboCount = 3
      const isJackpot = false

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateSlotMatrix.mockReturnValue(matrix)
      mockCalculateSlotPayout.mockReturnValue({
        payout,
        comboCount,
        isJackpot,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1100, // 1000 - 100 + 200
        level: 3,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount,
          multiplier,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.matrix).toEqual(matrix)
      expect(data.payout).toBe(payout)
      expect(data.comboCount).toBe(comboCount)
      expect(data.isJackpot).toBe(false)
      expect(data.points).toBe(1100)
      expect(data.pointsChange).toBe(100) // 200 - 100
      expect(mockGenerateSlotMatrix).toHaveBeenCalled()
      expect(mockCalculateSlotPayout).toHaveBeenCalledWith(
        matrix,
        betAmount,
        multiplier
      )
      expect(prisma.gameLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'cloverpit',
          betAmount: betAmount,
          payout: payout,
          profit: 100,
          result: 'WIN',
          multiplier: 2,
        },
      })
    })

    it('성공적인 스핀 - 잭팟', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        nickname: 'TestUser',
        points: 1000,
        level: 2,
      }

      const betAmount = 100
      const multiplier = 1
      const matrix = [
        ['💎', '💎', '💎'],
        ['💎', '💎', '💎'],
        ['💎', '💎', '💎'],
      ]
      const payout = 10000
      const comboCount = 8
      const isJackpot = true

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateSlotMatrix.mockReturnValue(matrix)
      mockCalculateSlotPayout.mockReturnValue({
        payout,
        comboCount,
        isJackpot,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 10900,
        level: 4,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})
      ;(prisma.billboardEvent.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount,
          multiplier,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isJackpot).toBe(true)
      expect(data.comboCount).toBe(8)
      expect(data.payout).toBe(payout)
      // 잭팟은 4콤보 이상이므로 전광판 이벤트 생성
      expect(prisma.billboardEvent.create).toHaveBeenCalled()
    })

    it('성공적인 스핀 - 패배', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
        level: 2,
      }

      const betAmount = 100
      const multiplier = 1
      const matrix = [
        ['🍒', '🍋', '🍊'],
        ['🍇', '🔔', '⭐'],
        ['💎', '🎰', '🍒'],
      ]
      const payout = 0
      const comboCount = 0
      const isJackpot = false

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateSlotMatrix.mockReturnValue(matrix)
      mockCalculateSlotPayout.mockReturnValue({
        payout,
        comboCount,
        isJackpot,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 900, // 1000 - 100
        level: 2,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount,
          multiplier,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.payout).toBe(0)
      expect(data.comboCount).toBe(0)
      expect(data.points).toBe(900)
      expect(data.pointsChange).toBe(-100)
      expect(prisma.gameLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'cloverpit',
          betAmount: betAmount,
          payout: 0,
          profit: -100,
          result: 'LOSE',
          multiplier: 0,
        },
      })
    })

    it('4콤보 이상 시 전광판 이벤트 생성', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        nickname: 'TestUser',
        points: 1000,
        level: 2,
      }

      const betAmount = 100
      const multiplier = 1
      const matrix = [
        ['🍒', '🍒', '🍒'],
        ['🍋', '🍋', '🍋'],
        ['🍊', '🍊', '🍊'],
      ]
      const payout = 500
      const comboCount = 4
      const isJackpot = false

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateSlotMatrix.mockReturnValue(matrix)
      mockCalculateSlotPayout.mockReturnValue({
        payout,
        comboCount,
        isJackpot,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1400,
        level: 3,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})
      ;(prisma.billboardEvent.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount,
          multiplier,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.comboCount).toBe(4)
      expect(prisma.billboardEvent.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'cloverpit',
          message: expect.stringContaining('[CLOVERPIT]'),
        },
      })
    })

    it('배율 적용 테스트', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
        level: 2,
      }

      const betAmount = 100
      const multiplier = 5 // x5 모드
      const matrix = [
        ['🍒', '🍒', '🍒'],
        ['🍋', '🍋', '🍋'],
        ['🍊', '🍊', '🍊'],
      ]
      const payout = 1000 // 배율 적용
      const comboCount = 3

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateSlotMatrix.mockReturnValue(matrix)
      mockCalculateSlotPayout.mockReturnValue({
        payout,
        comboCount,
        isJackpot: false,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1900,
        level: 3,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount,
          multiplier,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockCalculateSlotPayout).toHaveBeenCalledWith(
        matrix,
        betAmount,
        multiplier
      )
    })
  })

  describe('에러 케이스', () => {
    it('유효하지 않은 액션이면 400 에러', async () => {
      const request = new NextRequest('http://localhost/api/game/slot', {
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

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount: 100,
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
      mockGenerateSlotMatrix.mockImplementation(() => {
        throw new Error('서버 오류')
      })

      const request = new NextRequest('http://localhost/api/game/slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'spin',
          betAmount: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('서버 오류가 발생했습니다.')
    })
  })
})

