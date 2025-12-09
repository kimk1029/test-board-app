# 서버 시작 가이드

## 1. 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성하세요:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/test_board_db?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
```

**중요**: PostgreSQL 데이터베이스를 먼저 생성해야 합니다.

## 2. 데이터베이스 설정

### PostgreSQL 데이터베이스 생성

```bash
# PostgreSQL에 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE test_board_db;

# 사용자 생성 (선택사항)
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE test_board_db TO your_user;
```

### Prisma 스키마 적용

```bash
# Prisma Client 생성
npm run db:generate

# 데이터베이스에 스키마 적용
npm run db:push
```

## 3. 개발 서버 시작

```bash
npm run dev
```

서버가 시작되면 브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하세요.

## 4. 프로덕션 빌드 및 실행

```bash
# 빌드
npm run build

# 프로덕션 서버 시작
npm run start
```

## 문제 해결

### 포트가 이미 사용 중인 경우
```bash
# 다른 포트로 실행
PORT=3001 npm run dev
```

### 데이터베이스 연결 오류
- PostgreSQL이 실행 중인지 확인
- DATABASE_URL이 올바른지 확인
- 데이터베이스가 생성되었는지 확인

