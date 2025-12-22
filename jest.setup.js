// Jest 설정 파일
// 테스트 환경에서 필요한 전역 설정

// 환경 변수 모킹
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'
process.env.NODE_ENV = 'test'
process.env.NEXT_PHASE = undefined // 빌드 단계가 아님을 명시

// Node.js Web API polyfill (Jest 환경에서 필요)
if (typeof TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util')
  global.TextDecoder = TextDecoder
  global.TextEncoder = TextEncoder
}

// Next.js Request/Response polyfill
// Jest 환경에서 Next.js의 Web API를 사용하기 위한 설정
try {
  const { Request, Response, Headers } = require('next/dist/compiled/@edge-runtime/primitives')
  global.Request = Request
  global.Response = Response
  global.Headers = Headers
} catch (e) {
  // polyfill 로드 실패 시 기본 구현 사용
  console.warn('Next.js polyfill 로드 실패, 기본 구현 사용:', e.message)
}

// fetch 모킹 (필요시)
global.fetch = global.fetch || jest.fn()

// @testing-library/jest-dom 설정
require('@testing-library/jest-dom')
