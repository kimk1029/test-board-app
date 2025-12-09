# 데이터베이스 설정 가이드

## 자동 설정 (권장)

다음 명령어를 실행하면 자동으로 데이터베이스를 설정합니다:

```bash
./setup-db-manual.sh
```

이 스크립트는 다음을 수행합니다:
1. PostgreSQL 서비스 시작
2. 데이터베이스 생성 (`test_board_db`)
3. 사용자 생성 및 권한 부여
4. `.env` 파일 업데이트
5. Prisma 스키마 적용

## 수동 설정

### 1. PostgreSQL 서비스 시작

```bash
sudo service postgresql start
# 또는
sudo systemctl start postgresql
```

### 2. 데이터베이스 생성

```bash
sudo -u postgres psql
```

PostgreSQL 프롬프트에서:

```sql
-- 데이터베이스 생성
CREATE DATABASE test_board_db;

-- 사용자 생성
CREATE USER test_board_user WITH PASSWORD 'test_board_password';

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE test_board_db TO test_board_user;
ALTER DATABASE test_board_db OWNER TO test_board_user;

-- 연결 확인
\c test_board_db
GRANT ALL ON SCHEMA public TO test_board_user;

-- 종료
\q
```

### 3. .env 파일 설정

`.env` 파일을 다음과 같이 설정:

```env
DATABASE_URL="postgresql://test_board_user:test_board_password@localhost:5432/test_board_db?schema=public"
JWT_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Prisma 스키마 적용

```bash
# Prisma Client 생성
npm run db:generate

# 데이터베이스 스키마 적용
npm run db:push
```

## 확인

데이터베이스가 제대로 설정되었는지 확인:

```bash
# Prisma Studio로 데이터베이스 확인
npm run db:studio
```

브라우저에서 http://localhost:5555 로 접속하여 데이터베이스를 확인할 수 있습니다.

## 문제 해결

### PostgreSQL 서비스가 시작되지 않는 경우

```bash
# 서비스 상태 확인
sudo systemctl status postgresql

# 로그 확인
sudo journalctl -u postgresql
```

### 데이터베이스 연결 오류

1. PostgreSQL이 실행 중인지 확인:
   ```bash
   pg_isready
   ```

2. 데이터베이스가 생성되었는지 확인:
   ```bash
   psql -U postgres -l
   ```

3. 사용자 권한 확인:
   ```bash
   psql -U test_board_user -d test_board_db
   ```

