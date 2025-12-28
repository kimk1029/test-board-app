# Supabase 라이브 데이터베이스 연결 가이드

**참고**: Supabase는 라이브(프로덕션) 데이터베이스입니다. 연결 시 주의하세요.

## 방법 1: .env.local 파일 사용 (권장)

`.env.local` 파일을 생성하고 Supabase 라이브 데이터베이스 연결 정보를 설정하세요:

```bash
# .env.local 파일 생성
cat > .env.local <<EOF
# Supabase 라이브 데이터베이스 URL
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase 직접 연결 URL (마이그레이션 등에 사용)
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# JWT Secret (기존과 동일)
JWT_SECRET="your-secret-key-here"
EOF
```

그 다음 `yarn dev:supabase` 또는 `yarn dev:live`를 실행하세요:

```bash
yarn dev:supabase
# 또는
yarn dev:live
```

## 방법 2: 환경 변수 직접 설정

터미널에서 직접 환경 변수를 설정하고 실행:

```bash
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true" \
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres" \
yarn dev
```

## Supabase 연결 정보 확인 방법

1. Supabase 대시보드에 로그인
2. 프로젝트 선택
3. Settings > Database로 이동
4. Connection string 섹션에서 확인:
   - **Connection pooling** (권장): `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Direct connection**: `postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres`

## 주의사항

- **Supabase는 라이브(프로덕션) 데이터베이스입니다.** 연결 시 실제 프로덕션 데이터에 접근하게 됩니다.
- `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.
- Supabase 라이브 데이터베이스에 연결할 때는 주의하세요. 프로덕션 데이터를 수정할 수 있습니다.
- 개발/테스트 시에는 로컬 PostgreSQL 데이터베이스를 사용하는 것을 권장합니다.
- `yarn dev:supabase` 또는 `yarn dev:live`를 실행하면 `.env.local` 파일의 `DATABASE_URL`을 사용하여 Supabase 라이브 데이터베이스에 연결됩니다.

