/**
 * 홀덤 게임 액션 검증 로직
 * 클라이언트가 보낸 액션을 서버에서 검증하여 위변조 방지
 */

import { RoomWithPlayers } from './holdem/game-logic'

// Rate limiting: 사용자별 최대 액션 요청 횟수 (초당)
const MAX_ACTIONS_PER_SECOND = 5

// 액션 요청 기록 (메모리 기반)
const actionHistory: Map<number, number[]> = new Map()

/**
 * 액션 Rate limiting 체크
 */
export function checkHoldemActionRateLimit(userId: number): { allowed: boolean; error?: string } {
  const now = Date.now()
  const userActions = actionHistory.get(userId) || []

  // 1초 이내의 액션만 유지
  const recentActions = userActions.filter(timestamp => now - timestamp < 1000)

  if (recentActions.length >= MAX_ACTIONS_PER_SECOND) {
    return { 
      allowed: false, 
      error: '너무 빠른 액션 요청입니다. 잠시 후 다시 시도해주세요.' 
    }
  }

  recentActions.push(now)
  actionHistory.set(userId, recentActions)

  return { allowed: true }
}

/**
 * 홀덤 액션 유효성 검증
 */
export function validateHoldemAction(
  room: RoomWithPlayers,
  userId: number,
  action: string,
  amount: number
): { valid: boolean; error?: string } {
  // 1. 게임 상태 검증
  if (room.status !== 'playing') {
    return { valid: false, error: '게임이 진행 중이 아닙니다.' }
  }

  // 2. 플레이어 존재 확인
  const player = room.players.find(p => p.userId === userId)
  if (!player) {
    return { valid: false, error: '플레이어를 찾을 수 없습니다.' }
  }

  // 3. 플레이어 활성 상태 확인
  if (!player.isActive) {
    return { valid: false, error: '플레이어가 활성 상태가 아닙니다.' }
  }

  // 4. 턴 순서 검증
  const gameState = room.gameState as any
  if (gameState.currentTurnSeat !== player.seatIndex) {
    return { valid: false, error: '당신의 턴이 아닙니다.' }
  }

  // 5. 액션 타입 검증
  const validActions = ['fold', 'check', 'call', 'raise', 'allin']
  if (!validActions.includes(action)) {
    return { valid: false, error: '유효하지 않은 액션입니다.' }
  }

  // 6. 베팅 금액 검증
  const highestBet = Math.max(...room.players.map(p => p.currentBet))
  const toCall = highestBet - player.currentBet

  if (action === 'raise' || action === 'allin') {
    if (typeof amount !== 'number' || amount < 0) {
      return { valid: false, error: '베팅 금액이 유효하지 않습니다.' }
    }

    if (action === 'raise') {
      // 레이즈는 최소 베팅 이상이어야 함
      const minRaise = toCall + (gameState.minBet || 1)
      if (amount < minRaise && amount < player.chips) {
        return { 
          valid: false, 
          error: `레이즈 금액은 최소 ${minRaise} 이상이어야 합니다.` 
        }
      }
    }

    // 칩 보유량 검증
    if (amount > player.chips) {
      return { valid: false, error: '보유 칩이 부족합니다.' }
    }
  }

  // 7. Check 액션 검증 (콜할 금액이 있으면 체크 불가)
  if (action === 'check' && toCall > 0) {
    return { valid: false, error: '콜할 금액이 있어 체크할 수 없습니다.' }
  }

  // 8. Call 액션 검증 (콜할 금액이 없으면 체크해야 함)
  if (action === 'call' && toCall === 0) {
    return { valid: false, error: '콜할 금액이 없습니다. 체크하세요.' }
  }

  return { valid: true }
}

/**
 * 액션 기록 정리 (메모리 관리)
 */
export function cleanupActionHistory() {
  const now = Date.now()
  const userIds = Array.from(actionHistory.keys())
  for (const userId of userIds) {
    const actions = actionHistory.get(userId)
    if (!actions) continue
    
    const recentActions = actions.filter(timestamp => now - timestamp < 1000)
    if (recentActions.length === 0) {
      actionHistory.delete(userId)
    } else {
      actionHistory.set(userId, recentActions)
    }
  }
}

// 주기적으로 기록 정리 (1분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupActionHistory, 60 * 1000)
}

