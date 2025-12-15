/**
 * 게임 결과 서버 측 검증 로직
 * 클라이언트가 보낸 결과를 신뢰하지 않고 서버에서 검증
 */

// 베팅 금액 제한
const MAX_BET_AMOUNT = 1000000 // 최대 베팅 금액
const MIN_BET_AMOUNT = 1 // 최소 베팅 금액

// Rate limiting (초당 최대 베팅 횟수)
const MAX_BETS_PER_SECOND = 10

// 블랙잭 검증
export function validateBlackjackResult(
  playerCards: number[],
  dealerCards: number[],
  claimedResult: string,
  betAmount: number
): { valid: boolean; result: string; payout: number; error?: string } {
  // 베팅 금액 검증
  if (betAmount < MIN_BET_AMOUNT || betAmount > MAX_BET_AMOUNT) {
    return { valid: false, result: 'lose', payout: 0, error: '베팅 금액이 유효하지 않습니다.' }
  }

  // 카드 점수 계산
  const playerScore = calculateBlackjackScore(playerCards)
  const dealerScore = calculateBlackjackScore(dealerCards)

  // 실제 결과 계산
  let actualResult: 'win' | 'lose' | 'draw' | 'blackjack' = 'lose'
  let payout = 0

  if (playerScore > 21) {
    actualResult = 'lose'
    payout = 0
  } else if (dealerScore > 21) {
    actualResult = 'win'
    payout = betAmount * 2
  } else if (playerScore === 21 && playerCards.length === 2 && dealerScore !== 21) {
    actualResult = 'blackjack'
    payout = betAmount * 2.5
  } else if (playerScore === 21 && playerCards.length === 2 && dealerScore === 21 && dealerCards.length === 2) {
    actualResult = 'draw'
    payout = betAmount
  } else if (playerScore > dealerScore) {
    actualResult = 'win'
    payout = betAmount * 2
  } else if (playerScore < dealerScore) {
    actualResult = 'lose'
    payout = 0
  } else {
    actualResult = 'draw'
    payout = betAmount
  }

  // 클라이언트가 보낸 결과와 비교
  const isValid = actualResult === claimedResult.toLowerCase()

  return {
    valid: isValid,
    result: actualResult,
    payout: Math.floor(payout),
    error: isValid ? undefined : '게임 결과가 일치하지 않습니다.'
  }
}

// 블랙잭 점수 계산
function calculateBlackjackScore(cards: number[]): number {
  let score = 0
  let aces = 0

  for (const card of cards) {
    const value = card % 13
    if (value === 0) {
      // Ace
      aces++
      score += 11
    } else if (value >= 10) {
      // Face cards
      score += 10
    } else {
      score += value + 1
    }
  }

  // Ace를 1로 처리
  while (score > 21 && aces > 0) {
    score -= 10
    aces--
  }

  return score
}

// 그래프 게임 (Bustabit) 검증
export function validateBustabitResult(
  crashPoint: number,
  claimedMultiplier: number,
  betAmount: number,
  hasCashedOut: boolean
): { valid: boolean; multiplier: number; payout: number; error?: string } {
  // 베팅 금액 검증
  if (betAmount < MIN_BET_AMOUNT || betAmount > MAX_BET_AMOUNT) {
    return { valid: false, multiplier: 0, payout: 0, error: '베팅 금액이 유효하지 않습니다.' }
  }

  // 크래시 포인트 검증 (1.00 ~ 1000.00)
  if (crashPoint < 1.00 || crashPoint > 1000.00) {
    return { valid: false, multiplier: 0, payout: 0, error: '크래시 포인트가 유효하지 않습니다.' }
  }

  // 배율 검증
  if (hasCashedOut) {
    // 캐시아웃한 경우: 배율은 크래시 포인트보다 작아야 함
    if (claimedMultiplier >= crashPoint || claimedMultiplier < 1.00) {
      return { valid: false, multiplier: 0, payout: 0, error: '배율이 유효하지 않습니다.' }
    }
    const payout = betAmount * claimedMultiplier
    return { valid: true, multiplier: claimedMultiplier, payout: Math.floor(payout) }
  } else {
    // 크래시된 경우: 배율은 0
    if (claimedMultiplier !== 0) {
      return { valid: false, multiplier: 0, payout: 0, error: '크래시 시 배율은 0이어야 합니다.' }
    }
    return { valid: true, multiplier: 0, payout: 0 }
  }
}

// 룰렛 검증
export function validateRouletteResult(
  winningNumber: number,
  bets: Record<string, number>,
  claimedPayout: number,
  betAmount: number
): { valid: boolean; payout: number; error?: string } {
  // 베팅 금액 검증
  if (betAmount < MIN_BET_AMOUNT || betAmount > MAX_BET_AMOUNT) {
    return { valid: false, payout: 0, error: '베팅 금액이 유효하지 않습니다.' }
  }

  // 당첨 번호 검증 (0-36)
  if (winningNumber < 0 || winningNumber > 36) {
    return { valid: false, payout: 0, error: '당첨 번호가 유효하지 않습니다.' }
  }

  // 실제 지급액 계산
  let actualPayout = 0
  const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]

  for (const [zone, amount] of Object.entries(bets)) {
    let win = false
    let multiplier = 0

    if (zone.startsWith('n_')) {
      const betNum = parseInt(zone.split('_')[1])
      if (betNum === winningNumber) {
        win = true
        multiplier = 35
      }
    } else if (zone === 'red') {
      if (RED_NUMBERS.includes(winningNumber)) {
        win = true
        multiplier = 1
      }
    } else if (zone === 'black') {
      if (BLACK_NUMBERS.includes(winningNumber)) {
        win = true
        multiplier = 1
      }
    } else if (zone === 'even') {
      if (winningNumber !== 0 && winningNumber % 2 === 0) {
        win = true
        multiplier = 1
      }
    } else if (zone === 'odd') {
      if (winningNumber !== 0 && winningNumber % 2 !== 0) {
        win = true
        multiplier = 1
      }
    } else if (zone === 'low') {
      if (winningNumber >= 1 && winningNumber <= 18) {
        win = true
        multiplier = 1
      }
    } else if (zone === 'high') {
      if (winningNumber >= 19 && winningNumber <= 36) {
        win = true
        multiplier = 1
      }
    } else if (zone === 'doz_1') {
      if (winningNumber >= 1 && winningNumber <= 12) {
        win = true
        multiplier = 2
      }
    } else if (zone === 'doz_2') {
      if (winningNumber >= 13 && winningNumber <= 24) {
        win = true
        multiplier = 2
      }
    } else if (zone === 'doz_3') {
      if (winningNumber >= 25 && winningNumber <= 36) {
        win = true
        multiplier = 2
      }
    } else if (zone === 'col_1') {
      if (winningNumber !== 0 && winningNumber % 3 === 0) {
        win = true
        multiplier = 2
      }
    } else if (zone === 'col_2') {
      if (winningNumber !== 0 && winningNumber % 3 === 2) {
        win = true
        multiplier = 2
      }
    } else if (zone === 'col_3') {
      if (winningNumber !== 0 && winningNumber % 3 === 1) {
        win = true
        multiplier = 2
      }
    }

    if (win) {
      actualPayout += amount * multiplier + amount
    }
  }

  // 클라이언트가 보낸 지급액과 비교 (약간의 오차 허용)
  const isValid = Math.abs(actualPayout - claimedPayout) < 0.01

  return {
    valid: isValid,
    payout: Math.floor(actualPayout),
    error: isValid ? undefined : '지급액이 일치하지 않습니다.'
  }
}

// 슬롯머신 검증 (기본 검증만 - 완전한 검증은 서버에서 심볼 생성 필요)
export function validateSlotResult(
  claimedPayout: number,
  betAmount: number,
  comboCount: number
): { valid: boolean; maxPayout: number; error?: string } {
  // 베팅 금액 검증
  if (betAmount < MIN_BET_AMOUNT || betAmount > MAX_BET_AMOUNT) {
    return { valid: false, maxPayout: 0, error: '베팅 금액이 유효하지 않습니다.' }
  }

  // 최대 지급액 제한 (베팅 금액의 1000배)
  const maxPayout = betAmount * 1000

  // 클라이언트가 보낸 지급액이 최대값을 초과하는지 확인
  if (claimedPayout > maxPayout) {
    return { valid: false, maxPayout, error: '지급액이 최대값을 초과합니다.' }
  }

  // 콤보 수 검증 (0-8)
  if (comboCount < 0 || comboCount > 8) {
    return { valid: false, maxPayout, error: '콤보 수가 유효하지 않습니다.' }
  }

  return { valid: true, maxPayout }
}

// Rate limiting 체크 (간단한 구현)
const betHistory: Map<number, number[]> = new Map()

export function checkRateLimit(userId: number): { allowed: boolean; error?: string } {
  const now = Date.now()
  const userBets = betHistory.get(userId) || []

  // 1초 이내의 베팅만 유지
  const recentBets = userBets.filter(timestamp => now - timestamp < 1000)

  if (recentBets.length >= MAX_BETS_PER_SECOND) {
    return { allowed: false, error: '너무 빠른 베팅입니다. 잠시 후 다시 시도해주세요.' }
  }

  recentBets.push(now)
  betHistory.set(userId, recentBets)

  return { allowed: true }
}

