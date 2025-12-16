import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './auth';
import { 
  validateRequestSignature, 
  getClientIP, 
  validateUserAgent 
} from './request-signature';

// IP-토큰 바인딩 저장소 (메모리 기반, 프로덕션에서는 Redis 사용 권장)
const tokenIPBinding = new Map<string, { ip: string; userAgent: string; timestamp: number }>();
const BINDING_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10분마다 정리
const BINDING_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7일

// 주기적으로 오래된 바인딩 정리
setInterval(() => {
  const now = Date.now();
  for (const [tokenHash, binding] of Array.from(tokenIPBinding.entries())) {
    if (now - binding.timestamp > BINDING_EXPIRY) {
      tokenIPBinding.delete(tokenHash);
    }
  }
}, BINDING_CLEANUP_INTERVAL);

/**
 * 토큰과 IP/User-Agent 바인딩
 */
export function bindTokenToRequest(token: string, ip: string, userAgent: string): void {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  tokenIPBinding.set(tokenHash, {
    ip,
    userAgent,
    timestamp: Date.now()
  });
}

/**
 * 토큰과 요청의 IP/User-Agent 일치 여부 확인
 */
export function verifyTokenBinding(token: string, ip: string, userAgent: string): boolean {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const binding = tokenIPBinding.get(tokenHash);
  
  if (!binding) {
    // 첫 요청이면 바인딩 생성
    bindTokenToRequest(token, ip, userAgent);
    return true;
  }

  // IP와 User-Agent가 일치하는지 확인
  // IP는 약간의 유연성 허용 (프록시 환경 고려)
  const ipMatch = binding.ip === ip || binding.ip === 'unknown' || ip === 'unknown';
  const userAgentMatch = binding.userAgent === userAgent;

  // 둘 중 하나라도 일치하면 허용 (프록시 환경 고려)
  return ipMatch || userAgentMatch;
}

/**
 * 인증 및 요청 검증 통합 함수
 */
export async function authenticateAndValidateRequest(
  request: NextRequest,
  requireSignature: boolean = true
): Promise<{ 
  valid: boolean; 
  payload?: TokenPayload; 
  error?: string;
  status?: number;
}> {
  try {
    // 1. 토큰 검증
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { 
        valid: false, 
        error: '인증이 필요합니다.', 
        status: 401 
      };
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return { 
        valid: false, 
        error: '유효하지 않은 토큰입니다.', 
        status: 401 
      };
    }

    // 2. IP 및 User-Agent 검증
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent');

    // User-Agent 검증 (일반적인 브라우저인지 확인)
    if (!validateUserAgent(userAgent)) {
      // 개발 환경에서는 경고만, 프로덕션에서는 차단
      if (process.env.NODE_ENV === 'production') {
        return { 
          valid: false, 
          error: '유효하지 않은 요청입니다.', 
          status: 403 
        };
      }
    }

    // 3. 토큰-IP 바인딩 검증
    if (!verifyTokenBinding(token, clientIP, userAgent || '')) {
      return { 
        valid: false, 
        error: '요청이 유효하지 않습니다. (IP/User-Agent 불일치)', 
        status: 403 
      };
    }

    // 4. 요청 서명 검증 (POST/PUT/PATCH 요청에만)
    if (requireSignature && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.clone().json();
        const signatureValidation = validateRequestSignature(body, request.headers);
        
        if (!signatureValidation.valid) {
          return { 
            valid: false, 
            error: signatureValidation.error || '요청 서명이 유효하지 않습니다.', 
            status: 403 
          };
        }
      } catch (error) {
        // 본문이 없는 요청은 서명 검증 건너뛰기
        if (request.method === 'POST') {
          return { 
            valid: false, 
            error: '요청 본문이 필요합니다.', 
            status: 400 
          };
        }
      }
    }

    return { valid: true, payload };
  } catch (error) {
    console.error('Authentication error:', error);
    return { 
      valid: false, 
      error: '인증 처리 중 오류가 발생했습니다.', 
      status: 500 
    };
  }
}

