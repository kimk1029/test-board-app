// 포인트 시스템 유틸리티

/**
 * 레벨 계산 (포인트 기반)
 * 레벨 1: 0-99 포인트
 * 레벨 2: 100-299 포인트
 * 레벨 3: 300-599 포인트
 * 레벨 4: 600-999 포인트
 * 레벨 5: 1000-1499 포인트
 * 레벨 N: (N-1) * 100 + (N-2) * 200 포인트
 */
export function calculateLevel(points: number): number {
  if (points < 100) return 1
  if (points < 300) return 2
  if (points < 600) return 3
  if (points < 1000) return 4
  if (points < 1500) return 5
  
  // 레벨 6 이상: 500 포인트마다 레벨 증가
  return Math.floor((points - 1500) / 500) + 6
}

/**
 * 현재 레벨에서 다음 레벨까지 필요한 포인트 계산
 */
export function getPointsForNextLevel(level: number): number {
  if (level === 1) return 100
  if (level === 2) return 300
  if (level === 3) return 600
  if (level === 4) return 1000
  if (level === 5) return 1500
  
  // 레벨 6 이상: 500 포인트마다
  return 1500 + (level - 5) * 500
}

/**
 * 현재 레벨의 시작 포인트 계산
 */
export function getPointsForCurrentLevel(level: number): number {
  if (level === 1) return 0
  if (level === 2) return 100
  if (level === 3) return 300
  if (level === 4) return 600
  if (level === 5) return 1000
  
  // 레벨 6 이상
  return 1500 + (level - 6) * 500
}

/**
 * 레벨 진행률 계산 (0-100)
 */
export function getLevelProgress(points: number, level: number): number {
  const currentLevelPoints = getPointsForCurrentLevel(level)
  const nextLevelPoints = getPointsForNextLevel(level)
  const pointsInCurrentLevel = points - currentLevelPoints
  const pointsNeededForNextLevel = nextLevelPoints - currentLevelPoints
  
  return Math.min(100, Math.max(0, (pointsInCurrentLevel / pointsNeededForNextLevel) * 100))
}

