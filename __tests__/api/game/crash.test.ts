/**
 * 크래시 게임 API 테스트
 * 
 * 테스트 케이스:
 * 1. 보안 검증 (인증, 권한, 세션 검증)
 * 2. 베팅 검증 (금액, 포인트 부족)
 * 3. 게임 진행 (크래시 포인트 생성)
 * 4. 캐시아웃 검증 (배율 검증, 세션 검증)
 * 5. 크래시 처리
 * 6. 결과 검증 (승리/패배, 전광판 이벤트)
 * 7. 에러 케이스
 */

import { POST } from '@/app/api/game/crash/route'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'
import {
  generateCrashPoint,
  validateCashOut,
  calculateCrashPayout,
} from '@/lib/game-servers/crash-server'
import { NextRequest } from 'next/server'

// Prisma 모킹
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    gameSession: {
      create: jest.fn(),
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

// 크래시 서버 로직 모킹
const mockGenerateCrashPoint = jest.fn()
const mockValidateCashOut = jest.fn()
const mockCalculateCrashPayout = jest.fn()

jest.mock('@/lib/game-servers/crash-server', () => ({
  generateCrashPoint: (...args: any[]) => mockGenerateCrashPoint(...args),
  validateCashOut: (...args: any[]) => mockValidateCashOut(...args),
  calculateCrashPayout: (...args: any[]) => mockCalculateCrashPayout(...args),
}))

describe('크래시 게임 API', () => {
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

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'start',
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

  describe('게임 시작 (start)', () => {
    it('성공적인 게임 시작 - 베팅 및 크래시 포인트 생성', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
        level: 2,
      }

      const betAmount = 100
      const crashPoint = 2.5

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'bustabit',
        betAmount: betAmount,
        status: 'pending',
        gameData: {
          crashPoint,
          betAmount,
        },
        createdAt: new Date(),
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      mockGenerateCrashPoint.mockReturnValue(crashPoint)
      ;(prisma.gameSession.create as jest.Mock).mockResolvedValue(mockGameSession)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 900,
      })

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'start',
          betAmount,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('session-123')
      expect(data.crashPoint).toBe(crashPoint)
      expect(data.points).toBe(900)
      expect(mockGenerateCrashPoint).toHaveBeenCalled()
      expect(prisma.gameSession.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'bustabit',
          betAmount: betAmount,
          status: 'pending',
          gameData: {
            crashPoint,
            betAmount,
          },
        },
      })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { points: 900 },
      })
    })

    it('베팅 금액이 유효하지 않으면 400 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'start',
          betAmount: 0,
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

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'start',
          betAmount: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('포인트가 부족합니다.')
    })
  })

  describe('캐시아웃 (cashout)', () => {
    it('성공적인 캐시아웃', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        nickname: 'TestUser',
        points: 900,
        level: 2,
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'bustabit',
        betAmount: 100,
        status: 'pending',
        gameData: {
          crashPoint: 2.5,
          betAmount: 100,
        },
      }

      const multiplier = 2.0
      const payout = 200

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      mockValidateCashOut.mockReturnValue({ valid: true })
      mockCalculateCrashPayout.mockReturnValue(payout)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1100, // 900 + 200
        level: 3,
      })
      ;(prisma.gameSession.update as jest.Mock).mockResolvedValue({
        ...mockGameSession,
        status: 'settled',
        result: 'win',
        payout: payout,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'cashout',
          sessionId: 'session-123',
          multiplier,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.payout).toBe(payout)
      expect(data.points).toBe(1100)
      expect(data.pointsChange).toBe(100) // 200 - 100
      expect(mockValidateCashOut).toHaveBeenCalledWith(2.5, multiplier)
      expect(mockCalculateCrashPayout).toHaveBeenCalledWith(100, multiplier)
      expect(prisma.gameSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          status: 'settled',
          result: 'win',
          payout: payout,
          settledAt: expect.any(Date),
        },
      })
      expect(prisma.gameLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'bustabit',
          betAmount: 100,
          payout: payout,
          profit: 100,
          result: 'WIN',
          multiplier: multiplier,
        },
      })
    })

    it('10배 이상 캐시아웃 시 전광판 이벤트 생성', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        nickname: 'TestUser',
        points: 900,
        level: 2,
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'bustabit',
        betAmount: 100,
        status: 'pending',
        gameData: {
          crashPoint: 15.0,
          betAmount: 100,
        },
      }

      const multiplier = 10.0
      const payout = 1000

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      mockValidateCashOut.mockReturnValue({ valid: true })
      mockCalculateCrashPayout.mockReturnValue(payout)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1900,
        level: 4,
      })
      ;(prisma.gameSession.update as jest.Mock).mockResolvedValue({
        ...mockGameSession,
        status: 'settled',
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})
      ;(prisma.billboardEvent.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'cashout',
          sessionId: 'session-123',
          multiplier,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prisma.billboardEvent.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'bustabit',
          message: expect.stringContaining('[BUSTABIT]'),
        },
      })
    })

    it('세션 ID가 없으면 400 에러', async () => {
      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'cashout',
          multiplier: 2.0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('게임 세션이 필요합니다.')
    })

    it('유효하지 않은 배율이면 400 에러', async () => {
      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'cashout',
          sessionId: 'session-123',
          multiplier: 0.5, // 1.0 미만
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('유효하지 않은 배율입니다.')
    })

    it('유효하지 않은 세션이면 400 에러', async () => {
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'cashout',
          sessionId: 'invalid-session',
          multiplier: 2.0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('유효하지 않은 게임 세션입니다.')
    })

    it('다른 사용자의 세션이면 400 에러', async () => {
      const mockGameSession = {
        id: 'session-123',
        userId: 999, // 다른 사용자
        gameType: 'bustabit',
        betAmount: 100,
        status: 'pending',
        gameData: {},
      }

      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'cashout',
          sessionId: 'session-123',
          multiplier: 2.0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('유효하지 않은 게임 세션입니다.')
    })

    it('이미 종료된 게임이면 400 에러', async () => {
      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'bustabit',
        betAmount: 100,
        status: 'settled', // 이미 정산됨
        gameData: {},
      }

      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'cashout',
          sessionId: 'session-123',
          multiplier: 2.0,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('이미 종료된 게임입니다.')
    })

    it('캐시아웃 검증 실패 시 400 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 900,
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'bustabit',
        betAmount: 100,
        status: 'pending',
        gameData: {
          crashPoint: 2.5,
          betAmount: 100,
        },
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      mockValidateCashOut.mockReturnValue({
        valid: false,
        error: '크래시 포인트보다 높은 배율로 캐시아웃할 수 없습니다.',
      })

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'cashout',
          sessionId: 'session-123',
          multiplier: 3.0, // 크래시 포인트(2.5)보다 높음
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('크래시 포인트보다 높은 배율로 캐시아웃할 수 없습니다.')
    })
  })

  describe('크래시 처리 (crash)', () => {
    it('성공적인 크래시 처리 - 패배', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 900,
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'bustabit',
        betAmount: 100,
        status: 'pending',
        gameData: {
          crashPoint: 2.5,
          betAmount: 100,
        },
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      ;(prisma.gameSession.update as jest.Mock).mockResolvedValue({
        ...mockGameSession,
        status: 'settled',
        result: 'lose',
        payout: 0,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'crash',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBe('lose')
      expect(data.payout).toBe(0)
      expect(data.points).toBe(900)
      expect(data.pointsChange).toBe(-100)
      expect(prisma.gameSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          status: 'settled',
          result: 'lose',
          payout: 0,
          settledAt: expect.any(Date),
        },
      })
      expect(prisma.gameLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'bustabit',
          betAmount: 100,
          payout: 0,
          profit: -100,
          result: 'LOSE',
          multiplier: 0,
        },
      })
    })

    it('세션 ID가 없으면 400 에러', async () => {
      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'crash',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('게임 세션이 필요합니다.')
    })
  })

  describe('에러 케이스', () => {
    it('유효하지 않은 액션이면 400 에러', async () => {
      const request = new NextRequest('http://localhost/api/game/crash', {
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

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'start',
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
      mockGenerateCrashPoint.mockImplementation(() => {
        throw new Error('서버 오류')
      })

      const request = new NextRequest('http://localhost/api/game/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'start',
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

