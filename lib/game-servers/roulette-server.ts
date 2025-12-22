/**
 * 룰렛 서버 측 게임 로직
 * 당첨 번호를 서버에서 생성
 */

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]

// 룰렛 당첨 번호 생성 (0-36)
export function generateWinningNumber(): number {
  return Math.floor(Math.random() * 37) // 0-36
}

// 베팅 결과 계산
export function calculateRoulettePayout(
  winningNumber: number,
  bets: Record<string, number>
): number {
  let payout = 0
  
  for (const [zone, amount] of Object.entries(bets)) {
    let win = false
    let multiplier = 0
    
    // 단일 숫자 베팅
    if (zone.startsWith('n_')) {
      const betNum = parseInt(zone.split('_')[1])
      if (betNum === winningNumber) {
        win = true
        multiplier = 35
      }
    }
    // 빨강
    else if (zone === 'red') {
      if (RED_NUMBERS.includes(winningNumber)) {
        win = true
        multiplier = 1
      }
    }
    // 검정
    else if (zone === 'black') {
      if (BLACK_NUMBERS.includes(winningNumber)) {
        win = true
        multiplier = 1
      }
    }
    // 짝수
    else if (zone === 'even') {
      if (winningNumber !== 0 && winningNumber % 2 === 0) {
        win = true
        multiplier = 1
      }
    }
    // 홀수
    else if (zone === 'odd') {
      if (winningNumber !== 0 && winningNumber % 2 !== 0) {
        win = true
        multiplier = 1
      }
    }
    // 낮은 수 (1-18)
    else if (zone === 'low') {
      if (winningNumber >= 1 && winningNumber <= 18) {
        win = true
        multiplier = 1
      }
    }
    // 높은 수 (19-36)
    else if (zone === 'high') {
      if (winningNumber >= 19 && winningNumber <= 36) {
        win = true
        multiplier = 1
      }
    }
    // 첫 번째 12개 (1-12)
    else if (zone === 'doz_1') {
      if (winningNumber >= 1 && winningNumber <= 12) {
        win = true
        multiplier = 2
      }
    }
    // 두 번째 12개 (13-24)
    else if (zone === 'doz_2') {
      if (winningNumber >= 13 && winningNumber <= 24) {
        win = true
        multiplier = 2
      }
    }
    // 세 번째 12개 (25-36)
    else if (zone === 'doz_3') {
      if (winningNumber >= 25 && winningNumber <= 36) {
        win = true
        multiplier = 2
      }
    }
    // 첫 번째 열
    else if (zone === 'col_1') {
      if (winningNumber !== 0 && winningNumber % 3 === 0) {
        win = true
        multiplier = 2
      }
    }
    // 두 번째 열
    else if (zone === 'col_2') {
      if (winningNumber !== 0 && winningNumber % 3 === 2) {
        win = true
        multiplier = 2
      }
    }
    // 세 번째 열
    else if (zone === 'col_3') {
      if (winningNumber !== 0 && winningNumber % 3 === 1) {
        win = true
        multiplier = 2
      }
    }
    
    if (win) {
      payout += amount * multiplier + amount // 배당 + 원금
    }
  }
  
  return Math.floor(payout)
}

