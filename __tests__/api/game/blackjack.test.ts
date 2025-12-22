/**
 * 블랙잭 게임 API 테스트
 * 
 * 테스트 케이스:
 * 1. 게임 시작 (start) - 베팅 및 초기 카드 분배
 * 2. Hit - 카드 한 장 받기
 * 3. Stand - 딜러 턴 및 최종 결과
 * 4. Double - 더블 다운
 * 5. 에러 케이스들 (인증 실패, 세션 없음, 잘못된 액션 등)
 */

import { POST } from '@/app/api/game/blackjack/route'
import { prisma } from '@/lib/prisma'
import { authenticateAndValidateRequest } from '@/lib/request-auth'
import { calculateLevel } from '@/lib/points'
import { NextRequest } from 'next/server'
import {
  createServerDeck,
  dealInitialCards,
  hitCard,
  dealerTurn,
  calculateFinalResult,
} from '@/lib/game-servers/blackjack-server'

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

// 블랙잭 서버 로직 모킹
const mockIsBust = jest.fn()
const mockIsBlackjack = jest.fn()

jest.mock('@/lib/game-servers/blackjack-server', () => ({
  createServerDeck: jest.fn(),
  dealInitialCards: jest.fn(),
  hitCard: jest.fn(),
  dealerTurn: jest.fn(),
  calculateFinalResult: jest.fn(),
  isBlackjack: (...args: any[]) => mockIsBlackjack(...args),
  isBust: (...args: any[]) => mockIsBust(...args),
}))

describe('블랙잭 게임 API', () => {
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

      const request = new NextRequest('http://localhost/api/game/blackjack', {
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

    it('토큰 없이 요청 시 401 에러', async () => {
      ;(authenticateAndValidateRequest as jest.Mock).mockResolvedValue({
        valid: false,
        error: '인증이 필요합니다.',
        status: 401,
      })

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          betAmount: 100,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('인증이 필요합니다.')
    })
  })

  describe('게임 시작 (start)', () => {
    it('성공적인 게임 시작 - 베팅 및 초기 카드 분배', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        nickname: 'TestUser',
        points: 1000,
        level: 2,
      }

      const mockDeck = [
        { suit: 'hearts' as const, value: 'A', faceUp: false },
        { suit: 'diamonds' as const, value: 'K', faceUp: false },
        { suit: 'clubs' as const, value: 'Q', faceUp: false },
        { suit: 'spades' as const, value: 'J', faceUp: false },
      ]

      const mockPlayerCards = [
        { suit: 'hearts' as const, value: 'A', faceUp: true },
        { suit: 'diamonds' as const, value: 'K', faceUp: true },
      ]

      const mockDealerCards = [
        { suit: 'clubs' as const, value: 'Q', faceUp: true },
        { suit: 'spades' as const, value: 'J', faceUp: false },
      ]

      const mockRemainingDeck = mockDeck.slice(2)

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'blackjack',
        betAmount: 100,
        status: 'pending',
        gameData: {
          deck: mockRemainingDeck.map(c => ({ suit: c.suit, value: c.value })),
          playerCards: mockPlayerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
          dealerCards: mockDealerCards.map(c => ({ suit: c.suit, value: c.value, faceUp: c.faceUp })),
          deckIndex: mockRemainingDeck.length,
        },
        createdAt: new Date(),
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 900,
      })
      ;(createServerDeck as jest.Mock).mockReturnValue(mockDeck)
      ;(dealInitialCards as jest.Mock).mockReturnValue({
        playerCards: mockPlayerCards,
        dealerCards: mockDealerCards,
        remainingDeck: mockRemainingDeck,
      })
      ;(prisma.gameSession.create as jest.Mock).mockResolvedValue(mockGameSession)

      const request = new NextRequest('http://localhost/api/game/blackjack', {
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

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('session-123')
      expect(data.playerCards).toHaveLength(2)
      expect(data.dealerCards).toHaveLength(2)
      expect(data.points).toBe(900)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { points: 900 },
      })
      expect(prisma.gameSession.create).toHaveBeenCalled()
    })

    it('베팅 금액이 유효하지 않으면 400 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/game/blackjack', {
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
      expect(data.error).toContain('베팅 금액이 유효하지 않습니다')
    })

    it('포인트가 부족하면 400 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 50,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/game/blackjack', {
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

    it('인증 실패 시 401 에러', async () => {
      ;(authenticateAndValidateRequest as jest.Mock).mockResolvedValue({
        valid: false,
        error: '인증 실패',
        status: 401,
      })

      const request = new NextRequest('http://localhost/api/game/blackjack', {
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
    })
  })

  describe('Hit 액션', () => {
    it('성공적인 Hit - 카드 한 장 받기', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'blackjack',
        betAmount: 100,
        status: 'pending',
        gameData: {
          deck: [{ suit: 'hearts', value: '5' }],
          playerCards: [
            { suit: 'hearts', value: 'A', faceUp: true },
            { suit: 'diamonds', value: 'K', faceUp: true },
          ],
          dealerCards: [
            { suit: 'clubs', value: 'Q', faceUp: true },
            { suit: 'spades', value: 'J', faceUp: false },
          ],
          deckIndex: 1,
        },
      }

      const mockNewCard = {
        suit: 'hearts' as const,
        value: '5',
        faceUp: true,
      }

      const mockUpdatedPlayerCards = [
        ...mockGameSession.gameData.playerCards,
        mockNewCard,
      ]

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      ;(hitCard as jest.Mock).mockReturnValue({
        card: mockNewCard,
        remainingDeck: [],
      })
      ;(prisma.gameSession.update as jest.Mock).mockResolvedValue({
        ...mockGameSession,
        gameData: {
          ...mockGameSession.gameData,
          playerCards: mockUpdatedPlayerCards.map(c => ({
            suit: c.suit,
            value: c.value,
            faceUp: c.faceUp,
          })),
        },
      })

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'hit',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.playerCards).toHaveLength(3)
      expect(data.result).toBe('pending')
      expect(prisma.gameSession.update).toHaveBeenCalled()
    })

    it('버스트 시 lose 반환', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 1000,
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'blackjack',
        betAmount: 100,
        status: 'pending',
        gameData: {
          deck: [{ suit: 'hearts', value: 'K' }],
          playerCards: [
            { suit: 'hearts', value: '10', faceUp: true },
            { suit: 'diamonds', value: '10', faceUp: true },
          ],
          dealerCards: [
            { suit: 'clubs', value: 'Q', faceUp: true },
            { suit: 'spades', value: 'J', faceUp: false },
          ],
          deckIndex: 1,
        },
      }

      const mockNewCard = {
        suit: 'hearts' as const,
        value: 'K',
        faceUp: true,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      ;(hitCard as jest.Mock).mockReturnValue({
        card: mockNewCard,
        remainingDeck: [],
      })
      mockIsBust.mockReturnValue(true) // 버스트로 설정
      ;(prisma.gameSession.update as jest.Mock).mockResolvedValue(mockGameSession)

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'hit',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBe('lose')
      expect(data.bust).toBe(true)
    })

    it('세션 ID가 없으면 400 에러', async () => {
      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'hit',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('게임 세션이 필요합니다.')
    })

    it('유효하지 않은 세션이면 400 에러', async () => {
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'hit',
          sessionId: 'invalid-session',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('유효하지 않은 게임 세션입니다.')
    })
  })

  describe('Stand 액션', () => {
    it('성공적인 Stand - 딜러 턴 및 최종 결과', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 900,
        level: 2,
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'blackjack',
        betAmount: 100,
        status: 'pending',
        gameData: {
          deck: [],
          playerCards: [
            { suit: 'hearts', value: '10', faceUp: true },
            { suit: 'diamonds', value: '9', faceUp: true },
          ],
          dealerCards: [
            { suit: 'clubs', value: 'Q', faceUp: true },
            { suit: 'spades', value: '5', faceUp: false },
          ],
          deckIndex: 0,
        },
      }

      const mockPlayerCards = mockGameSession.gameData.playerCards.map(c => ({
        suit: c.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
        value: c.value,
        faceUp: true,
      }))

      const mockDealerCards = [
        ...mockGameSession.gameData.dealerCards.map(c => ({
          suit: c.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
          value: c.value,
          faceUp: c.faceUp,
        })),
        { suit: 'hearts' as const, value: '6', faceUp: true },
      ]

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      ;(dealerTurn as jest.Mock).mockReturnValue({
        dealerCards: mockDealerCards,
        remainingDeck: [],
      })
      ;(calculateFinalResult as jest.Mock).mockReturnValue({
        result: 'win' as const,
        payout: 200,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1100,
        level: 3,
      })
      ;(prisma.gameSession.update as jest.Mock).mockResolvedValue({
        ...mockGameSession,
        status: 'settled',
        result: 'win',
        payout: 200,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})
      ;(prisma.billboardEvent.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'stand',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBe('win')
      expect(data.payout).toBe(200)
      expect(data.points).toBe(1100)
      expect(data.pointsChange).toBe(100) // 200 - 100
      expect(prisma.gameSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-123' },
          data: expect.objectContaining({
            status: 'settled',
            result: 'win',
            payout: 200,
          }),
        })
      )
      expect(prisma.gameLog.create).toHaveBeenCalled()
    })
  })

  describe('Double 액션', () => {
    it('성공적인 Double - 추가 베팅 및 카드 한 장', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 900,
        level: 2,
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'blackjack',
        betAmount: 100,
        status: 'pending',
        gameData: {
          deck: [{ suit: 'hearts', value: '5' }],
          playerCards: [
            { suit: 'hearts', value: '10', faceUp: true },
            { suit: 'diamonds', value: '9', faceUp: true },
          ],
          dealerCards: [
            { suit: 'clubs', value: 'Q', faceUp: true },
            { suit: 'spades', value: '5', faceUp: false },
          ],
          deckIndex: 1,
        },
      }

      const mockNewCard = {
        suit: 'hearts' as const,
        value: '5',
        faceUp: true,
      }

      const mockUpdatedPlayerCards = [
        ...mockGameSession.gameData.playerCards,
        mockNewCard,
      ]

      const mockFinalDealerCards = [
        ...mockGameSession.gameData.dealerCards.map(c => ({
          suit: c.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
          value: c.value,
          faceUp: true,
        })),
        { suit: 'hearts' as const, value: '6', faceUp: true },
      ]

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      ;(hitCard as jest.Mock).mockReturnValue({
        card: mockNewCard,
        remainingDeck: [],
      })
      mockIsBust.mockReturnValue(false) // 버스트 아님
      ;(dealerTurn as jest.Mock).mockReturnValue({
        dealerCards: mockFinalDealerCards,
        remainingDeck: [],
      })
      ;(calculateFinalResult as jest.Mock).mockReturnValue({
        result: 'win' as const,
        payout: 400, // 200 * 2
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1200, // 900 - 100 (추가 베팅) + 400 (지급액) = 1200
        level: 3,
      })
      ;(prisma.gameSession.update as jest.Mock).mockResolvedValue({
        ...mockGameSession,
        status: 'settled',
        result: 'win',
        payout: 400,
        betAmount: 200,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'double',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBe('win')
      expect(data.payout).toBe(400)
      expect(data.points).toBe(1200)
      // Double은 추가 베팅 차감 후 최종 포인트 계산
      // 900 - 100 (추가 베팅) = 800, 그 다음 + 400 (지급액) = 1200
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          data: expect.objectContaining({
            points: 1200, // 최종 포인트
          }),
        })
      )
    })

    it('Double 시 포인트 부족하면 400 에러', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        points: 50, // 베팅 금액보다 적음
      }

      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'blackjack',
        betAmount: 100,
        status: 'pending',
        gameData: {},
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'double',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('더블 다운을 위한 포인트가 부족합니다.')
    })
  })

  describe('에러 케이스', () => {
    it('유효하지 않은 액션이면 400 에러', async () => {
      const request = new NextRequest('http://localhost/api/game/blackjack', {
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

    it('이미 정산된 게임이면 400 에러', async () => {
      const mockGameSession = {
        id: 'session-123',
        userId: mockUserId,
        gameType: 'blackjack',
        betAmount: 100,
        status: 'settled', // 이미 정산됨
        gameData: {},
      }

      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'hit',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('이미 종료된 게임입니다.')
    })

    it('다른 사용자의 세션이면 400 에러', async () => {
      const mockGameSession = {
        id: 'session-123',
        userId: 999, // 다른 사용자
        gameType: 'blackjack',
        betAmount: 100,
        status: 'pending',
        gameData: {},
      }

      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'hit',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('유효하지 않은 게임 세션입니다.')
    })

    it('블랙잭 승리 시 전광판 이벤트 생성', async () => {
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
        gameType: 'blackjack',
        betAmount: 100,
        status: 'pending',
        gameData: {
          deck: [],
          playerCards: [
            { suit: 'hearts', value: 'A', faceUp: true },
            { suit: 'diamonds', value: 'K', faceUp: true },
          ],
          dealerCards: [
            { suit: 'clubs', value: 'Q', faceUp: true },
            { suit: 'spades', value: '5', faceUp: false },
          ],
          deckIndex: 0,
        },
      }

      const mockPlayerCards = mockGameSession.gameData.playerCards.map(c => ({
        suit: c.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
        value: c.value,
        faceUp: true,
      }))

      const mockDealerCards = mockGameSession.gameData.dealerCards.map(c => ({
        suit: c.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
        value: c.value,
        faceUp: true,
      }))

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.gameSession.findUnique as jest.Mock).mockResolvedValue(mockGameSession)
      ;(dealerTurn as jest.Mock).mockReturnValue({
        dealerCards: mockDealerCards,
        remainingDeck: [],
      })
      ;(calculateFinalResult as jest.Mock).mockReturnValue({
        result: 'blackjack' as const,
        payout: 250,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        points: 1150,
        level: 3,
      })
      ;(prisma.gameSession.update as jest.Mock).mockResolvedValue({
        ...mockGameSession,
        status: 'settled',
        result: 'blackjack',
        payout: 250,
      })
      ;(prisma.gameLog.create as jest.Mock).mockResolvedValue({})
      ;(prisma.billboardEvent.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/game/blackjack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: mockToken,
        },
        body: JSON.stringify({
          action: 'stand',
          sessionId: 'session-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.result).toBe('blackjack')
      expect(prisma.billboardEvent.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          gameType: 'blackjack',
          message: expect.stringContaining('[BLACKJACK]'),
        },
      })
    })
  })
})

