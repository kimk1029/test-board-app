import crypto from 'crypto';

const REQUEST_SECRET = process.env.REQUEST_SECRET || process.env.JWT_SECRET || 'your-secret-key';
const REQUEST_TIMEOUT = 5 * 60 * 1000; // 5분

// Nonce 저장소 (메모리 기반, 프로덕션에서는 Redis 사용 권장)
const nonceStore = new Map<string, number>();
const NONCE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10분마다 정리

// 주기적으로 오래된 nonce 정리
setInterval(() => {
  const now = Date.now();
  for (const [nonce, timestamp] of Array.from(nonceStore.entries())) {
    if (now - timestamp > REQUEST_TIMEOUT) {
      nonceStore.delete(nonce);
    }
  }
}, NONCE_CLEANUP_INTERVAL);

/**
 * 요청 서명 생성
 * @param body 요청 본문 (JSON 문자열)
 * @param timestamp 타임스탬프
 * @param nonce 고유 nonce
 * @returns HMAC 서명
 */
export function generateRequestSignature(
  body: string,
  timestamp: number,
  nonce: string
): string {
  const message = `${body}:${timestamp}:${nonce}`;
  return crypto
    .createHmac('sha256', REQUEST_SECRET)
    .update(message)
    .digest('hex');
}

/**
 * 요청 서명 검증
 * @param body 요청 본문 (JSON 문자열)
 * @param timestamp 타임스탬프
 * @param nonce 고유 nonce
 * @param signature 받은 서명
 * @returns 검증 성공 여부
 */
export function verifyRequestSignature(
  body: string,
  timestamp: number,
  nonce: string,
  signature: string
): boolean {
  // 타임스탬프 검증 (5분 이내)
  const now = Date.now();
  if (Math.abs(now - timestamp) > REQUEST_TIMEOUT) {
    return false;
  }

  // Nonce 중복 검증
  if (nonceStore.has(nonce)) {
    return false; // 이미 사용된 nonce
  }

  // 서명 검증
  const expectedSignature = generateRequestSignature(body, timestamp, nonce);
  if (signature !== expectedSignature) {
    return false;
  }

  // Nonce 저장 (중복 방지)
  nonceStore.set(nonce, timestamp);
  return true;
}

/**
 * 요청 본문에서 서명 정보 추출 및 검증
 * @param requestBody 요청 본문 객체
 * @param headers 요청 헤더
 * @returns 검증 성공 여부
 */
export function validateRequestSignature(
  requestBody: any,
  headers: Headers
): { valid: boolean; error?: string } {
  try {
    // 서명 헤더 추출
    const signature = headers.get('X-Request-Signature');
    const timestamp = headers.get('X-Request-Timestamp');
    const nonce = headers.get('X-Request-Nonce');

    if (!signature || !timestamp || !nonce) {
      return { valid: false, error: '서명 정보가 없습니다.' };
    }

    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
      return { valid: false, error: '유효하지 않은 타임스탬프입니다.' };
    }

    // 요청 본문을 JSON 문자열로 변환 (정렬하여 일관성 유지)
    const bodyString = JSON.stringify(requestBody, Object.keys(requestBody).sort());

    // 서명 검증
    const isValid = verifyRequestSignature(bodyString, timestampNum, nonce, signature);
    
    if (!isValid) {
      return { valid: false, error: '요청 서명이 유효하지 않습니다.' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Request signature validation error:', error);
    return { valid: false, error: '서명 검증 중 오류가 발생했습니다.' };
  }
}

/**
 * IP 주소 추출 (프록시 환경 고려)
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

/**
 * User-Agent 검증 (일반적인 브라우저/앱 User-Agent인지 확인)
 */
export function validateUserAgent(userAgent: string | null): boolean {
  if (!userAgent) {
    return false;
  }

  // 일반적인 브라우저 User-Agent 패턴
  const validPatterns = [
    /Mozilla\/.*Chrome/i,
    /Mozilla\/.*Firefox/i,
    /Mozilla\/.*Safari/i,
    /Mozilla\/.*Edge/i,
    /Mobile\/.*Safari/i,
  ];

  return validPatterns.some(pattern => pattern.test(userAgent));
}

