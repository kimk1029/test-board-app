/**
 * 쿠지 기능 통합 테스트
 * 
 * 실제 DB를 사용한 통합 테스트 (선택적)
 * - 티켓 뽑기 → DB 업데이트 → 박스 상태 조회 → 재고 업데이트 확인
 * - 여러 티켓 동시 뽑기 후 재고 업데이트 확인
 * - 최신 데이터 반환 확인
 */

import { GET } from '@/app/api/kuji/box/route'
import { POST } from '@/app/api/kuji/tickets/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// 실제 DB 테스트는 환경 변수로 제어
const USE_REAL_DB = process.env.USE_REAL_DB === 'true'

describe('Kuji Integration Tests', () => {
  let testBoxId: number
  let testUserId: number
  let testToken: string

  beforeAll(async () => {
    if (!USE_REAL_DB) {
      // 모킹 모드에서는 스킵
      return
    }

    // 테스트용 사용자 생성
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        password: 'hashed-password',
        nickname: 'TestUser',
        points: 10000,
      },
    })
    testUserId = testUser.id

    // 테스트용 박스 생성
    const testBox = await prisma.kujiBox.create({
      data: {
        isActive: true,
        prizeInfo: [
          { rank: 'A', name: 'A상', color: '#ff4757', totalQty: 2 },
          { rank: 'B', name: 'B상', color: '#ffa502', totalQty: 3 },
        ],
        tickets: {
          create: [
            { ticketId: 0, rank: 'A', isTaken: false },
            { ticketId: 1, rank: 'A', isTaken: false },
            { ticketId: 2, rank: 'B', isTaken: false },
            { ticketId: 3, rank: 'B', isTaken: false },
            { ticketId: 4, rank: 'B', isTaken: false },
          ],
        },
      },
      include: {
        tickets: true,
      },
    })
    testBoxId = testBox.id
  })

  afterAll(async () => {
    if (!USE_REAL_DB) {
      return
    }

    // 테스트 데이터 정리
    if (testBoxId) {
      await prisma.kujiBox.delete({
        where: { id: testBoxId },
      })
    }
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      })
    }
  })

  describe('실제 DB 통합 테스트', () => {
    it.skip('티켓을 뽑은 후 box API가 최신 재고를 반환해야 함', async () => {
      if (!USE_REAL_DB) {
        console.log('실제 DB 테스트는 USE_REAL_DB=true로 실행하세요')
        return
      }

      // 1. 초기 박스 상태 확인
      const initialResponse = await GET()
      const initialData = await initialResponse.json()

      const initialPrizeA = initialData.prizeInfo.find((p: any) => p.rank === 'A')
      expect(initialPrizeA.qty).toBe(2) // 초기: 2개

      // 2. 티켓 뽑기
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: testUserId })

      const pickRequest = new NextRequest('http://localhost/api/kuji/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          boxId: testBoxId,
          ticketIds: [0], // 첫 번째 A상 티켓 뽑기
        }),
      })

      const pickResponse = await POST(pickRequest)
      expect(pickResponse.status).toBe(200)

      // 3. 업데이트된 박스 상태 확인
      const updatedResponse = await GET()
      const updatedData = await updatedResponse.json()

      const updatedPrizeA = updatedData.prizeInfo.find((p: any) => p.rank === 'A')
      expect(updatedPrizeA.qty).toBe(1) // 업데이트 후: 1개 남음

      // 4. 뽑힌 티켓 확인
      const pickedTicket = updatedData.tickets.find((t: any) => t.id === 0)
      expect(pickedTicket.isTaken).toBe(true)
      expect(pickedTicket.rank).toBe('A')
    })

    it.skip('여러 티켓을 동시에 뽑은 후 재고가 정확히 업데이트되어야 함', async () => {
      if (!USE_REAL_DB) {
        return
      }

      // 여러 티켓 동시 뽑기
      ;(verifyToken as jest.Mock).mockReturnValue({ userId: testUserId })

      const pickRequest = new NextRequest('http://localhost/api/kuji/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          boxId: testBoxId,
          ticketIds: [2, 3], // B상 2개 동시 뽑기
        }),
      })

      const pickResponse = await POST(pickRequest)
      expect(pickResponse.status).toBe(200)

      // 업데이트된 상태 확인
      const updatedResponse = await GET()
      const updatedData = await updatedResponse.json()

      const updatedPrizeB = updatedData.prizeInfo.find((p: any) => p.rank === 'B')
      expect(updatedPrizeB.qty).toBe(1) // 3개 중 2개 뽑혀서 1개 남음
    })
  })
})
