/**
 * 웹 보안 및 DDoS 방어 유틸리티
 */

// Rate Limiting 설정
const RATE_LIMIT_WINDOW = 60 * 1000 // 1분
const MAX_REQUESTS_PER_WINDOW = 300 // 윈도우당 최대 요청 수 (완화)
const MAX_REQUESTS_PER_SECOND = 30 // 초당 최대 요청 수 (완화)

// IP 차단 설정
const BLOCK_DURATION = 10 * 60 * 1000 // 10분 (완화)
const MAX_REQUESTS_BEFORE_BLOCK = 500 // 차단 전 최대 요청 수 (완화)

// 요청 기록 (메모리 기반, 프로덕션에서는 Redis 사용 권장)
interface RequestRecord {
  count: number
  windowStart: number
  lastRequest: number
  blocked: boolean
  blockUntil?: number
}

const requestRecords: Map<string, RequestRecord> = new Map()

// IP 차단 목록
const blockedIPs: Map<string, number> = new Map() // IP -> 차단 해제 시간

/**
 * Rate Limiting 체크
 */
export function checkRateLimit(
  ip: string,
  pathname: string
): { allowed: boolean; error?: string; retryAfter?: number; remaining?: number } {
  const now = Date.now()
  const key = `${ip}:${pathname}`
  
  let record = requestRecords.get(key)
  
  if (!record) {
    record = {
      count: 0,
      windowStart: now,
      lastRequest: now,
      blocked: false
    }
    requestRecords.set(key, record)
  }

  // 차단된 IP 확인
  if (record.blocked && record.blockUntil && now < record.blockUntil) {
    const retryAfter = Math.ceil((record.blockUntil - now) / 1000)
    return {
      allowed: false,
      error: 'Too many requests. Please try again later.',
      retryAfter
    }
  }

  // 윈도우 초기화 (1분 경과)
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    record.count = 0
    record.windowStart = now
  }

  // 요청 카운트 증가 (가중치 제거, 정상적인 요청 허용)
  record.count += 1
  record.lastRequest = now

  // 초당 요청 수 체크 (최근 1초간의 요청 수 계산)
  // 최근 1초 이내의 요청만 카운트
  const oneSecondAgo = now - 1000
  const recentRequests = record.count // 간단한 구현: 전체 카운트 사용
  // 실제로는 타임스탬프 배열을 유지해야 하지만, 성능을 위해 간단하게 처리
  
  // 윈도우당 요청 수 초과 확인
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    // IP 차단 (너무 많은 요청)
    record.blocked = true
    record.blockUntil = now + BLOCK_DURATION
    blockedIPs.set(ip, record.blockUntil)
    
    const retryAfter = Math.ceil(BLOCK_DURATION / 1000)
    return {
      allowed: false,
      error: 'Rate limit exceeded. IP temporarily blocked.',
      retryAfter
    }
  }

  // 초당 요청 수 체크는 제거 (너무 엄격함)
  // 대신 윈도우당 제한만 사용

  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count)
  return {
    allowed: true,
    remaining
  }
}

/**
 * IP 차단 목록 확인
 */
export function checkIPBlocklist(ip: string): boolean {
  const blockUntil = blockedIPs.get(ip)
  
  if (!blockUntil) {
    return false
  }

  const now = Date.now()
  
  // 차단 시간이 지났으면 제거
  if (now >= blockUntil) {
    blockedIPs.delete(ip)
    return false
  }

  return true
}

/**
 * 요청 기록 (DDoS 탐지용)
 */
export function recordRequest(ip: string, pathname: string, userAgent: string): void {
  const now = Date.now()
  const key = `${ip}:all`
  
  let record = requestRecords.get(key)
  
  if (!record) {
    record = {
      count: 0,
      windowStart: now,
      lastRequest: now,
      blocked: false
    }
    requestRecords.set(key, record)
  }

  // 윈도우 초기화
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    record.count = 0
    record.windowStart = now
  }

  record.count += 1
  record.lastRequest = now

  // DDoS 패턴 탐지: 매우 짧은 시간에 많은 요청
  if (record.count > MAX_REQUESTS_BEFORE_BLOCK) {
    record.blocked = true
    record.blockUntil = now + BLOCK_DURATION
    blockedIPs.set(ip, record.blockUntil)
    
    console.warn(`[SECURITY] IP ${ip} blocked due to suspicious activity`)
  }
}

/**
 * 기록 정리 (메모리 관리)
 */
export function cleanupSecurityRecords(): void {
  const now = Date.now()
  
  // 차단 목록 정리
  const blockedIPsArray = Array.from(blockedIPs.entries())
  for (const [ip, blockUntil] of blockedIPsArray) {
    if (now >= blockUntil) {
      blockedIPs.delete(ip)
    }
  }

  // 요청 기록 정리
  const requestRecordsArray = Array.from(requestRecords.entries())
  for (const [key, record] of requestRecordsArray) {
    // 5분 이상 사용되지 않은 기록 제거
    if (now - record.lastRequest > 5 * 60 * 1000) {
      requestRecords.delete(key)
    } else if (record.blocked && record.blockUntil && now >= record.blockUntil) {
      // 차단 시간이 지난 기록 초기화
      record.blocked = false
      record.blockUntil = undefined
      record.count = 0
    }
  }
}

// 주기적으로 기록 정리 (1분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupSecurityRecords, 60 * 1000)
}

/**
 * 요청 검증
 */
export function validateRequest(request: Request): { valid: boolean; error?: string } {
  // Content-Type 검증
  const contentType = request.headers.get('content-type')
  if (request.method === 'POST' && contentType && !contentType.includes('application/json')) {
    return { valid: false, error: 'Invalid content type' }
  }

  // 요청 크기 제한 (이미 middleware에서 처리하지만 추가 검증)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return { valid: false, error: 'Request too large' }
  }

  return { valid: true }
}

/**
 * SQL Injection 패턴 검사
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /('|(\\')|(;)|(--)|(\/\*)|(\*\/)|(\+)|(%))/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\bUNION\s+SELECT\b)/i,
  ]

  return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * XSS 패턴 검사
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[^>]*=.*javascript:/gi,
  ]

  return xssPatterns.some(pattern => pattern.test(input))
}

/**
 * 입력 값 검증 및 정제
 */
export function sanitizeInput(input: string): string {
  // HTML 태그 제거
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // 특수 문자 이스케이프
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  return sanitized
}

