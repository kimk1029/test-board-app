/**
 * 쿠지 박스 API 테스트
 * 
 * 테스트 케이스:
 * 1. 최신 박스 상태 반환 확인
 * 2. 등급별 남은 수량 계산 정확성
 * 3. 티켓 뽑기 후 업데이트된 상태 반환
 * 4. 캐싱 방지 헤더 확인
 */

import { GET } from '@/app/api/kuji/box/route'
import { POST } from '@/app/api/kuji/tickets/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Prisma 모킹
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    $transaction: jest.fn(),
    kujiBox: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    kujiTicket: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    gameLog: {
      createMany: jest.fn(),
    },
    billboardEvent: {
      create: jest.fn(),
    },
  },
}))

// Auth 모킹
jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}))

describe('Kuji Box API', () => {
  // 테스트 중 console.log/error 출력을 조용하게
  const originalConsoleError = console.error
  const originalConsoleLog = console.log

  beforeEach(() => {
    jest.clearAllMocks()
    // 테스트 중에는 console 출력을 숨김 (깔끔한 테스트 출력을 위해)
    console.error = jest.fn()
    console.log = jest.fn()
  })

  afterEach(() => {
    // 원래 console 함수 복원
    console.error = originalConsoleError
    console.log = originalConsoleLog
  })

  describe('GET /api/kuji/box', () => {
    it('최신 박스 상태를 반환해야 함', async () => {
      const mockBox = {
        id: 1,
        isActive: true,
        prizeInfo: [
          { rank: 'A', name: 'A상', color: '#ff4757', totalQty: 2 },
          { rank: 'B', name: 'B상', color: '#ffa502', totalQty: 3 },
        ],
        tickets: [
          { ticketId: 0, rank: 'A', isTaken: false },
          { ticketId: 1, rank: 'A', isTaken: false },
          { ticketId: 2, rank: 'B', isTaken: false },
          { ticketId: 3, rank: 'B', isTaken: false },
          { ticketId: 4, rank: 'B', isTaken: false },
        ],
      }

      ;(prisma.kujiBox.findMany as jest.Mock).mockResolvedValue([mockBox])
      ;(prisma.$connect as jest.Mock).mockResolvedValue(undefined)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.boxId).toBe(1)
      expect(data.tickets).toHaveLength(5)
      expect(data.prizeInfo).toBeDefined()
    })

    it('등급별 남은 수량을 정확히 계산해야 함', async () => {
      const mockBox = {
        id: 1,
        isActive: true,
        prizeInfo: [
          { rank: 'A', name: 'A상', color: '#ff4757', totalQty: 2 },
          { rank: 'B', name: 'B상', color: '#ffa502', totalQty: 3 },
        ],
        tickets: [
          { ticketId: 0, rank: 'A', isTaken: false }, // A상 1개 남음
          { ticketId: 1, rank: 'A', isTaken: true },  // A상 1개 뽑힘
          { ticketId: 2, rank: 'B', isTaken: false }, // B상 1개 남음
          { ticketId: 3, rank: 'B', isTaken: true },  // B상 1개 뽑힘
          { ticketId: 4, rank: 'B', isTaken: true },  // B상 1개 뽑힘
        ],
      }

      ;(prisma.kujiBox.findMany as jest.Mock).mockResolvedValue([mockBox])
      ;(prisma.$connect as jest.Mock).mockResolvedValue(undefined)

      const response = await GET()
      const data = await response.json()

      expect(data.prizeInfo).toBeDefined()
      const prizeA = data.prizeInfo.find((p: any) => p.rank === 'A')
      const prizeB = data.prizeInfo.find((p: any) => p.rank === 'B')

      expect(prizeA.qty).toBe(1) // A상 남은 수량: 1개
      expect(prizeA.totalQty).toBe(2) // A상 총 수량: 2개
      expect(prizeB.qty).toBe(1) // B상 남은 수량: 1개
      expect(prizeB.totalQty).toBe(3) // B상 총 수량: 3개
    })

    it('캐싱 방지 헤더를 설정해야 함', async () => {
      const mockBox = {
        id: 1,
        isActive: true,
        prizeInfo: [
          { rank: 'A', name: 'A상', color: '#ff4757', totalQty: 2 },
        ],
        tickets: [
          { ticketId: 0, rank: 'A', isTaken: false },
        ],
      }

      ;(prisma.kujiBox.findMany as jest.Mock).mockResolvedValue([mockBox])
      ;(prisma.$connect as jest.Mock).mockResolvedValue(undefined)

      const response = await GET()

      expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, proxy-revalidate')
      expect(response.headers.get('Pragma')).toBe('no-cache')
      expect(response.headers.get('Expires')).toBe('0')
    })

    it('뽑힌 티켓의 rank만 반환하고 뽑히지 않은 티켓의 rank는 null이어야 함', async () => {
      const mockBox = {
        id: 1,
        isActive: true,
        prizeInfo: null, // null로 설정
        tickets: [
          { ticketId: 0, rank: 'A', isTaken: true },  // 뽑힌 티켓
          { ticketId: 1, rank: 'B', isTaken: false }, // 뽑히지 않은 티켓
        ],
      }

      ;(prisma.kujiBox.findMany as jest.Mock).mockResolvedValue([mockBox])
      ;(prisma.$connect as jest.Mock).mockResolvedValue(undefined)

      const response = await GET()
      const data = await response.json()

      const takenTicket = data.tickets.find((t: any) => t.id === 0)
      const untakenTicket = data.tickets.find((t: any) => t.id === 1)

      expect(takenTicket.rank).toBe('A') // 뽑힌 티켓은 rank 반환
      expect(takenTicket.isTaken).toBe(true)
      expect(untakenTicket.rank).toBeNull() // 뽑히지 않은 티켓은 rank null
      expect(untakenTicket.isTaken).toBe(false)
    })
  })

  describe('POST /api/kuji/tickets (티켓 업데이트)', () => {
    it('티켓을 뽑은 후 DB에 업데이트되어야 함', async () => {
      const mockUserId = 1
      const mockBoxId = 1
      const mockTicketIds = [0, 1]

      const mockExistingTickets = [
        { ticketId: 0, boxId: mockBoxId, rank: 'A', isTaken: false },
        { ticketId: 1, boxId: mockBoxId, rank: 'B', isTaken: false },
      ]

      const mockUpdatedTickets = [
        { ticketId: 0, boxId: mockBoxId, rank: 'A', isTaken: true, takenBy: mockUserId },
        { ticketId: 1, boxId: mockBoxId, rank: 'B', isTaken: true, takenBy: mockUserId },
      ]

      ;(verifyToken as jest.Mock).mockReturnValue({ userId: mockUserId })
      ;(prisma.kujiTicket.findMany as jest.Mock).mockResolvedValueOnce(mockExistingTickets)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          kujiTicket: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            findMany: jest.fn().mockResolvedValue(mockUpdatedTickets),
          },
        }
        const result = await callback(mockTx)
        return {
          result: { count: 2 },
          updated: mockUpdatedTickets,
        }
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        nickname: 'TestUser',
        email: 'test@test.com',
      })
      ;(prisma.gameLog.createMany as jest.Mock).mockResolvedValue({ count: 2 })
      ;(prisma.billboardEvent.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost/api/kuji/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          boxId: mockBoxId,
          ticketIds: mockTicketIds,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.tickets).toHaveLength(2)
      expect(data.tickets[0].rank).toBe('A')
      expect(data.tickets[1].rank).toBe('B')
    })

    it('이미 뽑힌 티켓은 업데이트하지 않아야 함', async () => {
      const mockUserId = 1
      const mockBoxId = 1
      const mockTicketIds = [0]

      const mockExistingTickets = [
        { ticketId: 0, boxId: mockBoxId, rank: 'A', isTaken: true }, // 이미 뽑힌 티켓
      ]

      ;(verifyToken as jest.Mock).mockReturnValue({ userId: mockUserId })
      ;(prisma.kujiTicket.findMany as jest.Mock).mockResolvedValue(mockExistingTickets)

      const request = new NextRequest('http://localhost/api/kuji/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          boxId: mockBoxId,
          ticketIds: mockTicketIds,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('이미 뽑힌 티켓')
    })
  })

  describe('통합 테스트: 티켓 뽑기 후 박스 상태 업데이트', () => {
    it('티켓을 뽑은 후 box API 호출 시 업데이트된 재고를 반환해야 함', async () => {
      // 1. 초기 박스 상태
      const initialBox = {
        id: 1,
        isActive: true,
        prizeInfo: [
          { rank: 'A', name: 'A상', color: '#ff4757', totalQty: 2 },
        ],
        tickets: [
          { ticketId: 0, rank: 'A', isTaken: false },
          { ticketId: 1, rank: 'A', isTaken: false },
        ],
      }

      // 2. 티켓 뽑기 후 박스 상태
      const afterPickBox = {
        id: 1,
        isActive: true,
        prizeInfo: [
          { rank: 'A', name: 'A상', color: '#ff4757', totalQty: 2 },
        ],
        tickets: [
          { ticketId: 0, rank: 'A', isTaken: true },  // 뽑힘
          { ticketId: 1, rank: 'A', isTaken: false }, // 남음
        ],
      }

      const mockUserId = 1

      // 첫 번째 호출: 초기 상태
      ;(prisma.kujiBox.findMany as jest.Mock).mockResolvedValueOnce([initialBox])
      ;(prisma.$connect as jest.Mock).mockResolvedValue(undefined)

      const initialResponse = await GET()
      const initialData = await initialResponse.json()

      expect(initialData.prizeInfo[0].qty).toBe(2) // 초기: 2개 남음

      // 티켓 뽑기
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: mockUserId })
      ;(prisma.kujiTicket.findMany as jest.Mock).mockResolvedValueOnce([
        { ticketId: 0, boxId: 1, rank: 'A', isTaken: false },
      ])
      ;(prisma.$transaction as jest.Mock).mockImplementationOnce(async (callback) => {
        const mockTx = {
          kujiTicket: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findMany: jest.fn().mockResolvedValue([
              { ticketId: 0, boxId: 1, rank: 'A', isTaken: true, takenBy: mockUserId },
            ]),
          },
        }
        const result = await callback(mockTx)
        return {
          result: { count: 1 },
          updated: [{ ticketId: 0, boxId: 1, rank: 'A', isTaken: true, takenBy: mockUserId }],
        }
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        nickname: 'TestUser',
        email: 'test@test.com',
      })
      ;(prisma.gameLog.createMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.billboardEvent.create as jest.Mock).mockResolvedValue({})

      const pickRequest = new NextRequest('http://localhost/api/kuji/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          boxId: 1,
          ticketIds: [0],
        }),
      })

      await POST(pickRequest)

      // 두 번째 호출: 업데이트된 상태
      ;(prisma.kujiBox.findMany as jest.Mock).mockResolvedValueOnce([afterPickBox])

      const updatedResponse = await GET()
      const updatedData = await updatedResponse.json()

      expect(updatedData.prizeInfo[0].qty).toBe(1) // 업데이트 후: 1개 남음
      expect(updatedData.tickets.find((t: any) => t.id === 0).isTaken).toBe(true)
    })
  })
})
