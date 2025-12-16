/**
 * 게임 점수 검증 로직
 * 클라이언트가 보낸 점수를 서버에서 검증하여 위변조 방지
 */

// 게임별 최대 점수 제한
const MAX_SCORES: Record<string, number> = {
  stairs: 100000,      // 무한계단: 최대 10만층
  skyroads: 1000000,   // 스카이로드: 최대 100만 KM
  windrunner: 10000000, // 윈드러너: 최대 1000만 PTS
  stacker: 100000,     // 스태커: 최대 10만 블록
}

// 게임별 최소 점수 (0 이상)
const MIN_SCORE = 0

// 점수 증가율 검증: 이전 점수 대비 최대 증가율 (10배)
const MAX_SCORE_INCREASE_RATE = 10

// Rate limiting: 사용자별 최대 점수 저장 횟수 (분당)
const MAX_SCORE_SAVES_PER_MINUTE = 30

// 점수 저장 기록 (메모리 기반, 프로덕션에서는 Redis 사용 권장)
const scoreSaveHistory: Map<number, number[]> = new Map()

/**
 * 점수 저장 Rate limiting 체크
 */
export function checkScoreRateLimit(userId: number): { allowed: boolean; error?: string } {
  const now = Date.now()
  const userSaves = scoreSaveHistory.get(userId) || []

  // 1분 이내의 저장만 유지
  const recentSaves = userSaves.filter(timestamp => now - timestamp < 60000)

  if (recentSaves.length >= MAX_SCORE_SAVES_PER_MINUTE) {
    return { 
      allowed: false, 
      error: '너무 빠른 점수 저장입니다. 잠시 후 다시 시도해주세요.' 
    }
  }

  recentSaves.push(now)
  scoreSaveHistory.set(userId, recentSaves)

  return { allowed: true }
}

/**
 * 점수 유효성 검증
 */
export function validateScore(
  gameType: string,
  score: number,
  userId: number,
  previousScore?: number | null
): { valid: boolean; error?: string } {
  // 1. 기본 타입 및 범위 검증
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return { valid: false, error: '점수가 유효한 숫자가 아닙니다.' }
  }

  if (score < MIN_SCORE) {
    return { valid: false, error: '점수는 0 이상이어야 합니다.' }
  }

  // 2. 게임별 최대 점수 제한
  const maxScore = MAX_SCORES[gameType]
  if (maxScore && score > maxScore) {
    return { 
      valid: false, 
      error: `점수가 최대값(${maxScore.toLocaleString()})을 초과합니다.` 
    }
  }

  // 3. 점수 증가율 검증 (이전 점수가 있는 경우)
  if (previousScore !== null && previousScore !== undefined) {
    if (previousScore > 0) {
      const increaseRate = score / previousScore
      if (increaseRate > MAX_SCORE_INCREASE_RATE) {
        return { 
          valid: false, 
          error: `점수 증가율이 비정상적입니다. (${increaseRate.toFixed(2)}배)` 
        }
      }
    } else if (score > 0 && previousScore === 0) {
      // 0에서 양수로 증가하는 것은 허용 (첫 점수)
    }
  }

  // 4. 정수 검증 (일부 게임은 정수만 허용)
  const integerOnlyGames = ['stairs', 'stacker']
  if (integerOnlyGames.includes(gameType) && !Number.isInteger(score)) {
    return { valid: false, error: '점수는 정수여야 합니다.' }
  }

  return { valid: true }
}

/**
 * 게임별 점수 합리성 검증
 * 게임 시간, 난이도 등을 고려한 추가 검증
 */
export function validateScoreReasonableness(
  gameType: string,
  score: number,
  gameDuration?: number // 게임 플레이 시간 (밀리초)
): { valid: boolean; error?: string } {
  // 게임 시간이 제공된 경우 점수/시간 비율 검증
  if (gameDuration && gameDuration > 0) {
    const scorePerSecond = score / (gameDuration / 1000)
    
    // 게임별 최대 초당 점수
    const maxScorePerSecond: Record<string, number> = {
      stairs: 100,        // 초당 최대 100층
      skyroads: 1000,     // 초당 최대 1000 KM
      windrunner: 10000, // 초당 최대 10000 PTS
      stacker: 50,        // 초당 최대 50 블록
    }

    const maxRate = maxScorePerSecond[gameType]
    if (maxRate && scorePerSecond > maxRate) {
      return { 
        valid: false, 
        error: `점수 획득 속도가 비정상적입니다. (초당 ${scorePerSecond.toFixed(2)})` 
      }
    }
  }

  return { valid: true }
}

/**
 * 점수 저장 기록 정리 (메모리 관리)
 */
export function cleanupScoreHistory() {
  const now = Date.now()
  const userIds = Array.from(scoreSaveHistory.keys())
  for (const userId of userIds) {
    const saves = scoreSaveHistory.get(userId)
    if (!saves) continue
    
    const recentSaves = saves.filter(timestamp => now - timestamp < 60000)
    if (recentSaves.length === 0) {
      scoreSaveHistory.delete(userId)
    } else {
      scoreSaveHistory.set(userId, recentSaves)
    }
  }
}

// 주기적으로 기록 정리 (5분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupScoreHistory, 5 * 60 * 1000)
}

