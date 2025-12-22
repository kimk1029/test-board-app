/**
 * 슬롯머신 서버 측 게임 로직
 * 심볼 조합을 서버에서 생성
 */

// 심볼 데이터 (클라이언트와 동일한 구조)
export const SYMBOL_DATA = [
  { icon: '🍒', value: 2, weight: 30 },
  { icon: '🍋', value: 3, weight: 25 },
  { icon: '🍊', value: 4, weight: 20 },
  { icon: '🍇', value: 5, weight: 15 },
  { icon: '🔔', value: 10, weight: 5 },
  { icon: '⭐', value: 15, weight: 3 },
  { icon: '💎', value: 25, weight: 1.5 },
  { icon: '🎰', value: 50, weight: 0.5 },
]

// 심볼 생성 (가중치 기반)
export function generateSymbol(): string {
  const totalWeight = SYMBOL_DATA.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const item of SYMBOL_DATA) {
    if (random < item.weight) {
      return item.icon
    }
    random -= item.weight
  }
  
  return SYMBOL_DATA[0].icon
}

// 3x3 심볼 매트릭스 생성
export function generateSlotMatrix(): string[][] {
  return [
    [generateSymbol(), generateSymbol(), generateSymbol()],
    [generateSymbol(), generateSymbol(), generateSymbol()],
    [generateSymbol(), generateSymbol(), generateSymbol()],
  ]
}

// 승리 라인 체크
export function checkWinLines(matrix: string[][]): Array<{
  type: 'row' | 'col' | 'diag'
  index: number
  symbol: string
}> {
  const lines: Array<{ type: 'row' | 'col' | 'diag'; index: number; symbol: string }> = []
  
  // 행 체크
  for (let r = 0; r < 3; r++) {
    if (matrix[0][r] === matrix[1][r] && matrix[1][r] === matrix[2][r]) {
      lines.push({ type: 'row', index: r, symbol: matrix[0][r] })
    }
  }
  
  // 열 체크
  for (let c = 0; c < 3; c++) {
    if (matrix[c][0] === matrix[c][1] && matrix[c][1] === matrix[c][2]) {
      lines.push({ type: 'col', index: c, symbol: matrix[c][0] })
    }
  }
  
  // 대각선 체크
  if (matrix[0][0] === matrix[1][1] && matrix[1][1] === matrix[2][2]) {
    lines.push({ type: 'diag', index: 0, symbol: matrix[1][1] })
  }
  
  if (matrix[0][2] === matrix[1][1] && matrix[1][1] === matrix[2][0]) {
    lines.push({ type: 'diag', index: 1, symbol: matrix[1][1] })
  }
  
  return lines
}

// 잭팟 체크 (모든 심볼이 같을 때)
export function isJackpot(matrix: string[][]): boolean {
  const center = matrix[1][1]
  return matrix.flat().every(s => s === center)
}

// 승리 금액 계산
export function calculateSlotPayout(
  matrix: string[][],
  betAmount: number,
  multiplier: number = 1
): { payout: number; comboCount: number; isJackpot: boolean } {
  const jackpot = isJackpot(matrix)
  
  if (jackpot) {
    const jackpotWin = 100 * multiplier
    return { payout: Math.floor(jackpotWin), comboCount: 8, isJackpot: true }
  }
  
  const lines = checkWinLines(matrix)
  
  if (lines.length === 0) {
    return { payout: 0, comboCount: 0, isJackpot: false }
  }
  
  let baseScore = 0
  lines.forEach(line => {
    const data = SYMBOL_DATA.find(s => s.icon === line.symbol)
    if (data) {
      baseScore += data.value
    }
  })
  
  const comboMultiplier = lines.length
  const totalWin = baseScore * multiplier * comboMultiplier
  
  return {
    payout: Math.floor(totalWin),
    comboCount: lines.length,
    isJackpot: false,
  }
}

