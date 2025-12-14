const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Next.js 앱의 경로를 제공하여 next.config.js와 .env 파일을 로드합니다
  dir: './',
})

// Jest에 추가할 커스텀 설정
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // API 라우트 테스트는 node 환경 사용 (jsdom 불필요)
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'app/api/kuji/**/*.{js,jsx,ts,tsx}',
    'app/game/kuji/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  // Next.js 모듈 처리
  transformIgnorePatterns: [
    '/node_modules/(?!(next)/)',
  ],
  // 테스트 출력 설정
  silent: false, // false로 설정하면 모든 로그 표시
  verbose: true, // 각 테스트 케이스별 결과 표시
}

// createJestConfig는 이렇게 내보내집니다
module.exports = createJestConfig(customJestConfig)
